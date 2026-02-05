import React from 'react';
import { projectSuggestions } from "../utils/projectSuggestions";

export default function ProjectSuggestionCard({ skill }) {
  const suggestion = projectSuggestions[skill.toLowerCase()] || "Build a high-performance system using this tech.";

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 glass-card group flex flex-col h-full animate-card-in">
      {/* Skill Tag */}
      <div className="flex justify-between items-start mb-6">
        <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
          {skill}
        </span>
        <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-lg grayscale group-hover:grayscale-0 transition-all">
          🚀
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow">
        <h4 className="text-sm font-black text-slate-800 mb-3 leading-tight uppercase tracking-tight">
          Recommended Project
        </h4>
        <p className="text-gray-500 text-xs font-medium leading-relaxed">
          {suggestion}
        </p>
      </div>

      {/* Action Button */}
      <button className="mt-8 w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 transition-colors">
        Start Building
      </button>
    </div>
  );
}