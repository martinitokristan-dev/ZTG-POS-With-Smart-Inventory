<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'username'       => fake()->unique()->userName(),
            'password'       => static::$password ??= Hash::make('Admin*123'),
            'role'           => 'Cashier',
            'status'         => 'Active',
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * Configure the model factory.
     */
    public function configure(): static
    {
        return $this->afterCreating(function (User $user) {
            $data = $user->virtualProfileAttributes;

            UserProfile::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'full_name'     => $data['full_name'] ?? ($user->profile?->full_name ?? fake()->name()),
                    'phone_number'  => array_key_exists('phone_number', $data) ? $data['phone_number'] : ($user->profile?->phone_number ?? fake()->phoneNumber()),
                    'email'         => array_key_exists('email', $data) ? $data['email'] : ($user->profile?->email ?? fake()->unique()->safeEmail()),
                    'profile_photo' => array_key_exists('profile_photo', $data) ? $data['profile_photo'] : ($user->profile?->profile_photo ?? null),
                ]
            );
            $user->load('profile');
        });
    }
}
