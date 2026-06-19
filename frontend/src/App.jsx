import { Navigate, Route, Routes } from "react-router-dom";
import Shell from "./components/Shell.jsx";
import Upload from "./pages/Upload.jsx";
import Review from "./pages/Review.jsx";
import Label from "./pages/Label.jsx";
import Predict from "./pages/Predict.jsx";
import Insights from "./pages/Insights.jsx";
import Budget from "./pages/Budget.jsx";

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Navigate to="/insights" replace />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/review" element={<Review />} />
        <Route path="/label" element={<Label />} />
        <Route path="/predict" element={<Predict />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/budget" element={<Budget />} />
      </Routes>
    </Shell>
  );
}
