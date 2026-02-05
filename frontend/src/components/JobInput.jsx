export default function JobInput({ value, onChange }) {
  return (
    <textarea
      className="w-full border rounded-xl p-4 text-sm focus:outline-none focus:ring"
      rows={6}
      placeholder="Paste full job description here..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
