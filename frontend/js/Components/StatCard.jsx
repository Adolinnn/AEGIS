export default function StatCard({ label, value, accent, glowColor = '' }) {
    return (
        <div className="cyber-card-interactive relative overflow-hidden rounded-xl p-4 text-center shadow backdrop-blur-md group">
            {glowColor && (
                <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full blur-2xl pointer-events-none opacity-20 group-hover:opacity-60 transition-opacity ${glowColor}`}></div>
            )}
            <div className="relative z-10">
                <p className={`font-mono text-2xl font-bold group-hover:scale-110 transition-transform duration-200 ${accent}`}>{value}</p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400 font-semibold mt-1">{label}</p>
            </div>
        </div>
    );
}
