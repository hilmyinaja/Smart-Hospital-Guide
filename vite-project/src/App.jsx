import Main from "./MainPages/MainPage";
import Admin from "./AdminPages/AdminPage";
import Edit from "./EditPages/EditPage";
import { Route, Routes } from "react-router";

function App() {
  return (
    <>
      <Routes>
        <Route path="/mainpage" element={<Main />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/edit" element={<Edit />} />
      </Routes>
    </>
  );
}

export default App;