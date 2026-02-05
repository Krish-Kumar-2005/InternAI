export default function SkillGapCard({ data }) {
  // Ensure we have an array to work with
  const skills = data?.missing_skills || [];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
        Missing Skills
      </p>
      
      <div className="flex flex-wrap gap-2 mt-4">
        {skills.length > 0 ? (
          skills.map((skill, index) => (
            <span
              key={index}
              className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-semibold border border-red-100"
            >
              + {skill}
            </span>
          ))
        ) : (
          <p className="text-sm text-green-600 font-medium bg-green-50 px-3 py-2 rounded-lg w-full">
            ✨ You have all the required skills for this role!
          </p>
        )}
      </div>
    </div>
  );
}