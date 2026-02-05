import api from "../services/api";

export default function ResumeUpload({ onExtract }) {
  const upload = async (e) => {
    const file = e.target.files[0];
    const form = new FormData();
    form.append("file", file);

    const res = await api.post("/resume/upload", form);
    onExtract(res.data.resume_text);
  };

  return (
    <input
      type="file"
      accept=".pdf,.docx"
      onChange={upload}
      className="block"
    />
  );
}
