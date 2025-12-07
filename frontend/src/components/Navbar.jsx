import { Link, useNavigate } from 'react-router-dom';

const Navbar = ({ isAuthenticated, onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    if (onLogout) onLogout();
    navigate('/login');
  };

  if (!isAuthenticated) return null;

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-[#dc2626] to-[#b91c1c] text-white shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-white/95 rounded-md flex items-center justify-center shadow">
              <span className="text-[#dc2626] font-bold">CMS</span>
            </div>
            <span className="text-lg font-semibold">College Management</span>
          </div>
          <div className="flex space-x-1">
            <Link to="/dashboard" className="px-4 py-2 rounded-md hover:bg-white/10 transition-all duration-200 font-medium">
              Dashboard
            </Link>
            <Link to="/subjects" className="px-4 py-2 rounded-md hover:bg-white/10 transition-all duration-200 font-medium">
              Subjects
            </Link>
            <Link to="/enroll" className="px-4 py-2 rounded-md hover:bg-white/10 transition-all duration-200 font-medium">
              Enroll
            </Link>
            <Link to="/scanner" className="px-4 py-2 rounded-md hover:bg-white/10 transition-all duration-200 font-medium">
              Scanner
            </Link>
            <button
              onClick={handleLogout}
              className="ml-3 px-4 py-2 bg-gradient-to-r from-[#ef4444] to-[#dc2626] text-white rounded-md hover:from-[#dc2626] hover:to-[#b91c1c] transition-colors font-medium shadow-lg"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
