<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Siem\Rules\RuleRegistry;

class SiemRuleController extends Controller
{
    public function index(Request $request)
    {
        $rules = collect(RuleRegistry::all())->map(function ($rule) {
            return [
                'key' => $rule->key(),
                'title' => $rule->title(),
                'severity' => $rule->severity(),
                'mitre' => $rule->mitre(),
                'description' => $rule->description(),
                'threshold' => $rule->defaultThreshold(),
                'window' => $rule->defaultWindow(),
            ];
        })->values();

        return Inertia::render('Siem/Rules/Index', [
            'rules' => $rules
        ]);
    }
}
