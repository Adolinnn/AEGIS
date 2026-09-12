<?php

use Illuminate\Support\Facades\Broadcast;
use App\Models\ScanRun;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('scan-run.{id}', function ($user, $id) {
    $run = ScanRun::find($id);
    return $run && (int) $run->user_id === (int) $user->id;
});
