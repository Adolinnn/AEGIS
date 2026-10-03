<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\SiemEvent;
use Carbon\Carbon;

class PruneSiemEvents extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'siem:prune {--days=30 : The number of days of events to retain}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Prune old SIEM events to save database space';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $days = (int) $this->option('days');
        $this->info("Pruning SIEM events older than {$days} days...");

        $cutoff = Carbon::now()->subDays($days);

        $count = SiemEvent::where('occurred_at', '<', $cutoff)->delete();

        $this->info("Successfully pruned {$count} old events.");
    }
}
