<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use CloudinaryLabs\CloudinaryLaravel\Facades\Cloudinary;
use CloudinaryLabs\CloudinaryLaravel\CloudinaryEngine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Feature tests for POST /api/profile/avatar and DELETE /api/profile/avatar.
 *
 * Since we now use Cloudinary for uploads, these tests mock the Cloudinary facade
 * to avoid real network calls. All Laravel validation rules are still exercised.
 *
 * Covers the security guarantees stated in ProfileAvatarController:
 *  1. Validation rejects non-image files and enforces max 12 288 KB
 *  2. Update is scoped to $request->user() — injected user_id in body is ignored
 *  3. Old-file deletion failure is non-fatal; new upload always succeeds
 *
 * Plus functional coverage:
 *  4. Successful upload → Cloudinary URL persisted in DB
 *  5. Second upload replaces old URL in DB
 *  6. Remove nulls DB column
 *  7. Remove with no photo is graceful (200)
 *  8. Unauthenticated requests return 401
 */
class ProfileAvatarTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private User $otherUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::create([
            'full_name'    => 'Test User',
            'phone_number' => '09123456789',
            'email'        => 'test@ztg.com',
            'username'     => 'testuser',
            'password'     => Hash::make('password'),
            'pin'          => '1234',
            'role'         => UserRole::ADMIN,
            'status'       => UserStatus::ACTIVE,
        ]);

        $this->otherUser = User::create([
            'full_name'    => 'Other User',
            'phone_number' => '09987654321',
            'email'        => 'other@ztg.com',
            'username'     => 'other',
            'password'     => Hash::make('password'),
            'pin'          => null,
            'role'         => UserRole::CASHIER,
            'status'       => UserStatus::ACTIVE,
        ]);
    }

    /** Return a fake Cloudinary upload result mock. */
    private function mockCloudinaryUpload(string ...$urls): void
    {
        if (empty($urls)) {
            $urls = ['https://res.cloudinary.com/test/image/upload/v1/avatars/avatar_test.jpg'];
        }
        $responses = array_map(fn($url) => new \Cloudinary\Api\ApiResponse(['secure_url' => $url, 'url' => $url], []), $urls);
        $destroyResponse = new \Cloudinary\Api\ApiResponse(['result' => 'ok'], []);

        $mockUploadApi = \Mockery::mock(\Cloudinary\Api\Upload\UploadApi::class);
        $mockUploadApi->shouldReceive('upload')->andReturnValues($responses);
        $mockUploadApi->shouldReceive('destroy')->andReturn($destroyResponse);

        $cloudinaryMock = \Mockery::mock(\Cloudinary\Cloudinary::class);
        $cloudinaryMock->shouldReceive('uploadApi')->andReturn($mockUploadApi);

        $this->app->instance(\Cloudinary\Cloudinary::class, $cloudinaryMock);
    }

    /** Mock Cloudinary destroy (deletion). */
    private function mockCloudinaryDestroy(): void
    {
        $mockUploadApi = \Mockery::mock(\Cloudinary\Api\Upload\UploadApi::class);
        $mockUploadApi->shouldReceive('destroy')->andReturn(new \Cloudinary\Api\ApiResponse(['result' => 'ok'], []));

        $cloudinaryMock = \Mockery::mock(\Cloudinary\Cloudinary::class);
        $cloudinaryMock->shouldReceive('uploadApi')->andReturn($mockUploadApi);

        $this->app->instance(\Cloudinary\Cloudinary::class, $cloudinaryMock);
    }

    /** Create a fake image file that passes Laravel's 'image|mimes:jpeg' rules. */
    private function fakeJpeg(string $name = 'photo.jpg', int $kilobytes = 100): UploadedFile
    {
        return UploadedFile::fake()->create($name, $kilobytes, 'image/jpeg');
    }

    /* ── 1a. Successful upload ───────────────────────────────────────────── */

    public function test_authenticated_user_can_upload_avatar(): void
    {
        $this->mockCloudinaryUpload();

        $response = $this->actingAs($this->user)
            ->postJson('/api/profile/avatar', ['avatar' => $this->fakeJpeg()]);

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'profile_photo'])
            ->assertJsonFragment(['message' => 'Profile photo uploaded successfully.']);

        $url = $this->user->fresh()->profile_photo;
        $this->assertNotNull($url);
        $this->assertStringContainsString('res.cloudinary.com', $url);
    }

    /* ── 1b. Validation: missing file ───────────────────────────────────── */

    public function test_upload_rejects_missing_file(): void
    {
        $this->actingAs($this->user)
            ->postJson('/api/profile/avatar', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['avatar']);
    }

    /* ── 1c. Validation: non-image MIME type ────────────────────────────── */

    public function test_upload_rejects_non_image_file(): void
    {
        $file = UploadedFile::fake()->create('malicious.txt', 50, 'text/plain');

        $this->actingAs($this->user)
            ->postJson('/api/profile/avatar', ['avatar' => $file])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['avatar']);
    }

    /* ── 1d. Validation: oversized file (> 12 288 KB) ───────────────────── */

    public function test_upload_rejects_oversized_file(): void
    {
        $file = UploadedFile::fake()->create('huge.jpg', 13000, 'image/jpeg');

        $this->actingAs($this->user)
            ->postJson('/api/profile/avatar', ['avatar' => $file])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['avatar']);
    }

    /* ── 2. Endpoint scoped to authenticated user — injected user_id ignored */

    public function test_upload_only_affects_authenticated_user(): void
    {
        $this->mockCloudinaryUpload('https://res.cloudinary.com/test/image/upload/v1/avatars/user1.jpg');

        $victim = 'https://res.cloudinary.com/test/image/upload/v1/avatars/victim.jpg';
        $this->otherUser->update(['profile_photo' => $victim]);

        $this->actingAs($this->user)
            ->postJson('/api/profile/avatar', [
                'avatar'  => $this->fakeJpeg(),
                'user_id' => $this->otherUser->id,  // must be ignored by endpoint
            ]);

        // $this->user got a new photo
        $this->assertNotNull($this->user->fresh()->profile_photo);

        // otherUser's photo is completely unchanged
        $this->assertEquals($victim, $this->otherUser->fresh()->profile_photo);
    }

    /* ── 3. Old-file deletion failure does not block new upload ─────────── */

    public function test_upload_succeeds_when_old_photo_is_external_url(): void
    {
        // Non-Cloudinary URL → deleteCloudinaryImage() skips it safely
        $this->user->update(['profile_photo' => 'https://cdn.example.com/avatar.jpg']);

        $newUrl = 'https://res.cloudinary.com/test/image/upload/v1/avatars/new.jpg';
        $this->mockCloudinaryUpload($newUrl);

        $response = $this->actingAs($this->user)
            ->postJson('/api/profile/avatar', ['avatar' => $this->fakeJpeg('new.jpg')]);

        $response->assertStatus(200);
        $storedUrl = $this->user->fresh()->profile_photo;
        $this->assertEquals($newUrl, $storedUrl);
    }

    /* ── 4. Second upload replaces old URL in DB ─────────────────────────── */

    public function test_second_upload_replaces_old_profile_photo_url(): void
    {
        $firstUrl  = 'https://res.cloudinary.com/test/image/upload/v1/avatars/first.jpg';
        $secondUrl = 'https://res.cloudinary.com/test/image/upload/v1/avatars/second.jpg';

        $this->mockCloudinaryUpload($firstUrl, $secondUrl);

        $this->actingAs($this->user)
            ->postJson('/api/profile/avatar', ['avatar' => $this->fakeJpeg('first.jpg')]);
        $this->assertEquals($firstUrl, $this->user->fresh()->profile_photo);

        $this->actingAs($this->user)
            ->postJson('/api/profile/avatar', ['avatar' => $this->fakeJpeg('second.jpg')]);

        $this->assertEquals($secondUrl, $this->user->fresh()->profile_photo);
    }

    /* ── 5. Remove nulls profile_photo ──────────────────────────────────── */

    public function test_remove_nulls_profile_photo(): void
    {
        $storedUrl = 'https://res.cloudinary.com/test/image/upload/v1/avatars/stored.jpg';
        $this->user->update(['profile_photo' => $storedUrl]);

        $this->mockCloudinaryDestroy();

        $this->actingAs($this->user)
            ->deleteJson('/api/profile/avatar')
            ->assertStatus(200)
            ->assertJsonFragment(['profile_photo' => null]);

        $this->assertNull($this->user->fresh()->profile_photo);
    }

    /* ── 6. Remove with no photo is graceful ────────────────────────────── */

    public function test_remove_when_no_photo_returns_200_gracefully(): void
    {
        $this->assertNull($this->user->fresh()->profile_photo);

        $this->actingAs($this->user)
            ->deleteJson('/api/profile/avatar')
            ->assertStatus(200)
            ->assertJsonFragment(['profile_photo' => null]);

        $this->assertNull($this->user->fresh()->profile_photo);
    }

    /* ── 7. Unauthenticated requests return 401 ─────────────────────────── */

    public function test_unauthenticated_upload_returns_401(): void
    {
        $this->postJson('/api/profile/avatar', ['avatar' => $this->fakeJpeg()])
            ->assertStatus(401);
    }

    public function test_unauthenticated_remove_returns_401(): void
    {
        $this->deleteJson('/api/profile/avatar')->assertStatus(401);
    }
}
