import React from 'react';

export default function TrustReport({ data }) {
  if (!data) return null;

  const isVerified = data.score >= 75;

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-blue-50/40">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-1">Authenticity Report</h3>
          <div className="flex items-center gap-2">
             <span className={`text-2xl font-black ${isVerified ? 'text-blue-600' : 'text-orange-500'}`}>
                {data.score}% Trust Score
             </span>
             {isVerified && (
               <span className="bg-blue-600 text-white p-1 rounded-full text-[10px]" title="Verified Internship">
                 ✓
               </span>
             )}
          </div>
        </div>
        <div className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider ${
          isVerified ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
        }`}>
          {data.verdict}
        </div>
      </div>

      <div className="space-y-3">
        {data.signals.map((signal, idx) => (
          <div key={idx} className="flex items-center gap-3 text-xs font-medium text-gray-600">
            <div className={`w-1.5 h-1.5 rounded-full ${isVerified ? 'bg-blue-400' : 'bg-orange-400'}`} />
            {signal}
          </div>
        ))}
      </div>
      
      {!isVerified && (
        <p className="mt-6 p-4 bg-red-50 text-red-600 text-[10px] font-bold rounded-xl leading-relaxed uppercase">
          ⚠️ Warning: This listing shows patterns of a "Ghost Job." Exercise caution before sharing personal data.
        </p>
      )}
    </div>
  );
}