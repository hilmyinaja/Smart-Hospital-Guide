import Main from "./MainPages/MainPage";
import Login from "./LoginPages/LoginPage";
import { Route, Routes } from "react-router";

function App() {
  return (
    <>
      <Routes>
        <Route path="/mainpage" element={<Main />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </>
  );
}

export default App;