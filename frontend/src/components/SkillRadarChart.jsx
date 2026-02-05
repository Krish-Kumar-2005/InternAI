import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

export default function SkillRadarChart({ data }) {
  // Transform your AI response data into the format Recharts expects
  // data format: [{ skill: 'Python', user: 90, required: 100 }, ...]
  
  return (
    <div className="w-full h-[400px] bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-blue-50/50">
      <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
        <span>🎯</span> Skill Alignment Map
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="skill" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          
          {/* Required Skills Area */}
          <Radar
            name="Job Requirements"
            dataKey="required"
            stroke="#94a3b8"
            fill="#94a3b8"
            fillOpacity={0.1}
          />
          
          {/* Student Skills Area */}
          <Radar
            name="Your Skills"
            dataKey="user"
            stroke="#2563eb"
            fill="#3b82f6"
            fillOpacity={0.6}
          />
        </RadarChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-6 mt-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
          <span className="text-xs font-bold text-gray-500">You</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
          <span className="text-xs font-bold text-gray-500">Required</span>
        </div>
      </div>
    </div>
  );
}