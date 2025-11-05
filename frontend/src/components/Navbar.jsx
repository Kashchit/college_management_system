import { Link, useNavigate } from 'react-router-dom';

const Navbar = ({ isAuthenticated, onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    if (onLogout) onLogout();
    navigate('/login');
  };

  if (!isAuthenticated) return null;

  return (
    <nav className="bg-primary text-white shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex space-x-6">
            <Link to="/" className="hover:opacity-80 transition">Home</Link>
            <Link to="/subjects" className="hover:opacity-80 transition">Subjects</Link>
            <Link to="/enroll" className="hover:opacity-80 transition">Enroll</Link>
            <Link to="/scanner" className="hover:opacity-80 transition">Scanner</Link>
            <Link to="/dashboard" className="hover:opacity-80 transition">Dashboard</Link>
          </div>
          <button onClick={handleLogout} className="bg-white text-primary px-4 py-2 rounded hover:bg-gray-100 transition">Logout</button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

