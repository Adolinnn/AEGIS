import { Head, Link } from '@inertiajs/react';

export default function Welcome({ auth }) {
    return (
        <>
            <Head title="Aegis | Automated Web Security" />
            
            <div className="min-h-screen bg-gray-950 text-gray-300 font-sans selection:bg-red-600 selection:text-white">
                
                {/* Navigation Bar */}
                <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            {/* Logo */}
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                            </svg>
                            <span className="text-white font-bold text-2xl tracking-widest uppercase">Aegis</span>
                            <span className="hidden sm:block text-xs font-mono text-gray-600 mt-1">v1.0.0-beta</span>
                        </div>
                        <div className="flex items-center gap-6">
                            {auth.user ? (
                                <Link href={route('dashboard')} className="text-sm font-semibold text-gray-400 hover:text-white transition">Dashboard</Link>
                            ) : (
                                <>
                                    <Link href={route('login')} className="text-sm font-semibold text-gray-400 hover:text-white transition">Log in</Link>
                                    <Link href={route('register')} className="px-5 py-2 text-sm font-bold text-white bg-red-600 rounded-md hover:bg-red-500 transition shadow-[0_0_15px_rgba(220,38,38,0.4)]">Deploy Now</Link>
                                </>
                            )}
                        </div>
                    </div>
                </nav>

                {/* Hero Section */}
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 flex flex-col lg:flex-row items-center gap-12">
                    
                    {/* Left Copy */}
                    <div className="flex-1 space-y-8">
                        <div className="inline-block px-3 py-1 border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-mono rounded-full">
                            [ STATUS: MONITORING ACTIVE ]
                        </div>
                        <h1 className="text-5xl lg:text-6xl font-extrabold text-white leading-tight">
                            Your Automated <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-400">Vulnerability Scanner.</span>
                        </h1>
                        <p className="text-lg text-gray-400 max-w-xl">
                            Aegis continuously monitors your web applications for downtime and actively scans for vulnerabilities like XSS and SSRF. When a threat is detected, our AI generates the exact patch code you need.
                        </p>
                        
                        <div className="flex gap-4">
                            <Link href={route('register')} className="px-8 py-3 text-base font-bold text-white bg-red-600 rounded-md hover:bg-red-500 transition shadow-[0_0_20px_rgba(220,38,38,0.5)]">
                                Start Free Trial
                            </Link>
                            <a href="#features" className="px-8 py-3 text-base font-bold text-gray-300 border border-gray-700 rounded-md hover:bg-gray-800 transition">
                                View Docs
                            </a>
                        </div>
                    </div>

                    {/* Right Terminal Mockup */}
                    <div className="flex-1 w-full max-w-2xl">
                        <div className="bg-black border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
                            {/* Terminal Header */}
                            <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                <span className="ml-2 text-xs font-mono text-gray-500">aegis-scanner-process</span>
                            </div>
                            
                            {/* Terminal Body */}
                            <div className="p-6 font-mono text-sm space-y-4">
                                <div className="text-gray-400">
                                    <span className="text-green-500">➜</span> target: <span className="text-white">api.production.app</span>
                                </div>
                                <div className="text-gray-400">
                                    [14:02:45] Executing uptime ping... <span className="text-green-500">200 OK (45ms)</span>
                                </div>
                                <div className="text-gray-400">
                                    [14:02:46] Injecting SSRF payload into /webhook endpoint...
                                </div>
                                <div className="text-red-500 font-bold bg-red-950/30 inline-block p-1">
                                    [ALERT] SSRF Vulnerability Detected! Response resolved internal IP (169.254.169.254).
                                </div>
                                
                                <div className="text-gray-400 pt-4 border-t border-gray-800">
                                    <span className="text-blue-400">AI Remediation Engaged:</span>
                                </div>
                                <div className="text-gray-300 bg-gray-900 p-3 rounded border border-gray-700">
                                    <span className="text-gray-500">// Suggested Express.js Middleware Patch:</span><br/>
                                    <span className="text-purple-400">const</span> <span className="text-yellow-200">isPrivateIP</span> = (ip) =&gt; /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|169\.254\.)/.test(ip);<br/>
                                    <span className="text-purple-400">if</span> (isPrivateIP(req.body.url)) return res.status(<span className="text-orange-400">403</span>).send(<span className="text-green-400">'Forbidden'</span>);
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Feature Grid */}
                <section id="features" className="border-t border-gray-800 bg-gray-950 py-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                        
                        {/* Feature 1 */}
                        <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl hover:border-red-500/50 transition">
                            <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">High-Frequency Uptime</h3>
                            <p className="text-gray-400 text-sm">Minute-by-minute pings ensure you are the first to know if your API or frontend goes offline, with instant Discord or Slack webhook alerts.</p>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl hover:border-red-500/50 transition">
                            <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Automated Threat Scans</h3>
                            <p className="text-gray-400 text-sm">Passive and active scans hit your endpoints with standard payloads to catch missing headers, XSS, and injection flaws before deployment.</p>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl hover:border-red-500/50 transition">
                            <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">AI-Generated Patches</h3>
                            <p className="text-gray-400 text-sm">Don't just find vulnerabilities—fix them instantly. Our LLM integration writes the exact middleware or sanitization code needed for your specific stack.</p>
                        </div>

                    </div>
                </section>
            </div>
        </>
    );
}