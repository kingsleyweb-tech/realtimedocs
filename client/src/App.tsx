import { BrowserRouter, Routes, Route } from "react-router-dom";
import Document from "./pages/Document";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Starred from "./pages/Starred";
import Trash from "./pages/Trash";
import SharedWithMe from "./pages/SharedWithMe";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ToastContainer from "./components/ToastContainer";


function App() {

  return (

    <BrowserRouter>
      <ToastContainer />

      <Routes>

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/starred"
          element={<Starred />}
        />

        <Route
          path="/trash"
          element={<Trash />}
        />

        <Route
          path="/shared-with-me"
          element={<SharedWithMe />}
        />


        <Route
          path="/document/:id"
          element={<Document />}
        />

        <Route
  path="/login"
  element={<Login />}
/>

<Route
  path="/register"
  element={<Register />}
/>

      </Routes>

    </BrowserRouter>

  );
}


export default App;