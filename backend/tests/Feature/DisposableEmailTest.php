<?php

namespace Tests\Feature;

use App\Rules\NotDisposableEmail;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

class DisposableEmailTest extends TestCase
{
    private function validateEmail(string $email): bool
    {
        $v = Validator::make(['email' => $email], [
            'email' => ['required', 'email:rfc', new NotDisposableEmail()],
        ]);

        return $v->passes();
    }

    public function test_valid_real_email_passes(): void
    {
        $this->assertTrue($this->validateEmail('user@gmail.com'));
        $this->assertTrue($this->validateEmail('john.doe@company.ph'));
        $this->assertTrue($this->validateEmail('contact@outlook.com'));
    }

    public function test_standard_disposable_domain_is_blocked(): void
    {
        $this->assertFalse($this->validateEmail('scam@temp-mail.org'));
        $this->assertFalse($this->validateEmail('throwaway@guerrillamail.com'));
        $this->assertFalse($this->validateEmail('anon@mailinator.com'));
        $this->assertFalse($this->validateEmail('burner@yopmail.com'));
    }

    public function test_subdomain_of_disposable_domain_is_blocked(): void
    {
        $this->assertFalse($this->validateEmail('test@subdomain.mailinator.com'));
        $this->assertFalse($this->validateEmail('test@team.temp-mail.org'));
        $this->assertFalse($this->validateEmail('test@vip.guerrillamail.com'));
    }

    public function test_known_bot_and_dummy_domains_are_blocked(): void
    {
        $this->assertFalse($this->validateEmail('bot@fake.com'));
        $this->assertFalse($this->validateEmail('crawler@bot.com'));
        $this->assertFalse($this->validateEmail('admin@admin.com'));
        $this->assertFalse($this->validateEmail('test@sample.com'));
        $this->assertFalse($this->validateEmail('user@botmail.com'));
        $this->assertFalse($this->validateEmail('test@example.com'));
    }

    public function test_gibberish_and_fake_handles_are_blocked(): void
    {
        $this->assertFalse($this->validateEmail('asdadjl@gmail.com'));
        $this->assertFalse($this->validateEmail('adsda@gmail.com'));
        $this->assertFalse($this->validateEmail('asdfgh123@gmail.com'));
    }
}
