<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\SiemEvent;
use App\Jobs\ProcessSiemBatchJob;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

class SiemIngestController extends Controller
{
    public function __invoke(Request $request)
    {
        $agent = $request->attributes->get('siem_agent');

        $validated = $request->validate([
            'batch_id' => 'required|string',
            'agent_version' => 'nullable|string',
            'events' => 'required|array|max:1000',
            'events.*.source' => 'required|string',
            'events.*.path' => 'nullable|string',
            'events.*.line' => 'required|string',
            'events.*.collected_at' => 'required|string',
        ]);

        $batchId = $validated['batch_id'];

        // Idempotency check: cache for 10 minutes
        $cacheKey = "siem_batch_{$agent->id}_{$batchId}";
        if (Cache::has($cacheKey)) {
            return response()->json(['status' => 'ok', 'message' => 'Batch already processed'], 202);
        }

        $now = now();
        $insertData = [];

        foreach ($validated['events'] as $event) {
            $collectedAt = null;
            try {
                $collectedAt = Carbon::parse($event['collected_at']);
                if ($collectedAt->isAfter($now->copy()->addMinutes(5))) {
                    $collectedAt = $now; // Clamp future timestamps
                }
            } catch (\Exception $e) {
                $collectedAt = $now;
            }

            $insertData[] = [
                'user_id' => $agent->user_id,
                'agent_id' => $agent->id,
                'occurred_at' => $collectedAt, // Temporary, will be updated by parser
                'received_at' => $now,
                'source' => $event['source'],
                'event_type' => 'unknown',
                'raw' => Str::limit($event['line'], 4000, ''),
            ];
        }

        if (empty($insertData)) {
            return response()->json(['status' => 'ok'], 202);
        }

        // Fast bulk insert
        DB::table('siem_events')->insert($insertData);

        // Get the inserted ID range (we can query the last X records inserted by this agent recently to process them)
        // A better approach for bulk is to insert and retrieve IDs, but MySQL doesn't return multiple IDs.
        // We can dispatch the job with the batch_id and agent_id, and have the job query the events that are 'unknown' for this agent.
        // Wait, what if we insert with a specific batch identifier? We don't have a column for it.
        // Let's just pass agent_id and tell the job to process 'unknown' events for this agent.
        
        ProcessSiemBatchJob::dispatch($agent->id);

        Cache::put($cacheKey, true, now()->addMinutes(10));

        return response()->json(['status' => 'ok'], 202);
    }
}
