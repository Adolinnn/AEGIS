<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Enums\SubscriptionTier;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class DowngradeExpiredTrials extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'aegis:trials';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Downgrades users whose trials have expired to the free tier';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $expiredUsers = User::whereNotNull('trial_ends_at')
            ->where('trial_ends_at', '<', now())
            ->get();

        $count = $expiredUsers->count();

        if ($count > 0) {
            foreach ($expiredUsers as $user) {
                $user->update([
                    'subscription_tier' => SubscriptionTier::Free,
                    'trial_ends_at' => null,
                ]);
            }
            Log::info("Downgraded {$count} users with expired trials to the Free tier.");
            $this->info("Downgraded {$count} users.");
        } else {
            $this->info("No expired trials found.");
        }
    }
}
