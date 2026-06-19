import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Cegah akses URL langsung
    if (!location.state || !location.state.authorized) {
      navigate("/");
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthenticated(true);
      } else {
        setAuthenticated(false);
        navigate("/");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate, location]);

  if (loading) return null;
  return authenticated ? children : null;
}
