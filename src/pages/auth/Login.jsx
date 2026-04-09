import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import logo from '../../assets/logo3.6.png';

const Login = () => {
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!employeeCode.trim() || !password) {
      toast.error('Please enter employee code and password');
      return;
    }

    setLoading(true);
    try {
      await login(employeeCode.trim().toUpperCase(), password);
      toast.success('Welcome back! 👋');
      navigate(from, { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Login failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Soft Gradient Background */}
      <div className="bg-shape shape1"></div>
      <div className="bg-shape shape2"></div>
      <div className="bg-shape shape3"></div>

      <div className="wrapper">
        {/* Logo */}
        <div className="logo-section">
          <div className="logo-box">
            <img src={logo} alt="Logo" />
          </div>
          <h1>Infinity Arthvishva</h1>
          <p>Welcome back! Please login</p>
        </div>

        {/* Card */}
        <div className="card">
          <form onSubmit={handleSubmit}>
            {/* Employee Code */}
            <div className="input-group">
              <label>Employee Code</label>
              <input
                type="text"
                value={employeeCode}
                onChange={(e) =>
                  setEmployeeCode(e.target.value.toUpperCase())
                }
                placeholder="IA00001"
              />
            </div>

            {/* Password */}
            <div className="input-group">
              <label>Password</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="login-btn"
            >
              {loading && <Loader2 className="spin" size={18} />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="footer-text">
            Contact HR for login credentials
          </p>
        </div>

        <p className="copyright">
          © 2026 Infinity Arthvishva
        </p>
      </div>

      {/* Styles */}
      <style>{`
        * {
          box-sizing: border-box;
          font-family: 'Inter', sans-serif;
        }

        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f0f9ff, #ecfeff, #fdf2f8);
          padding: 20px;
          position: relative;
          overflow: hidden;
        }

        /* Soft Background Shapes */
        .bg-shape {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
        }

        .shape1 {
          width: 400px;
          height: 400px;
          background: #38bdf8;
          top: -100px;
          right: -100px;
          opacity: 0.3;
        }

        .shape2 {
          width: 350px;
          height: 350px;
          background: #34d399;
          bottom: -80px;
          left: -80px;
          opacity: 0.3;
        }

        .shape3 {
          width: 300px;
          height: 300px;
          background: #f472b6;
          top: 30%;
          left: 10%;
          opacity: 0.25;
        }

        .wrapper {
          width: 100%;
          max-width: 420px;
          z-index: 2;
        }

        .logo-section {
          text-align: center;
          margin-bottom: 25px;
        }

        .logo-box {
          width: 70px;
          height: 70px;
          border-radius: 16px;
          background: #fff;
          margin: auto;
          padding: 10px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }

        .logo-section h1 {
          margin-top: 10px;
          font-size: 1.5rem;
          font-weight: 700;
          color: #0f172a;
        }

        .logo-section p {
          font-size: 0.9rem;
          color: #475569;
        }

        /* Card */
        .card {
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 30px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.08);
        }

        .input-group {
          margin-bottom: 18px;
        }

        .input-group label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #334155;
          display: block;
          margin-bottom: 6px;
        }

        .input-group input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          font-size: 0.95rem;
          outline: none;
          transition: all 0.2s;
        }

        .input-group input:focus {
          border-color: #38bdf8;
          box-shadow: 0 0 0 3px rgba(56,189,248,0.2);
        }

        .password-wrapper {
          position: relative;
        }

        .password-wrapper button {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #64748b;
        }
.login-btn {
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #2076C7, #1CADA3);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  margin-top: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  transition: transform 0.2s, box-shadow 0.2s;
}

        .login-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(56,189,248,0.3);
        }

        .login-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .footer-text {
          margin-top: 15px;
          font-size: 0.8rem;
          text-align: center;
          color: #64748b;
        }

        .copyright {
          text-align: center;
          font-size: 0.75rem;
          margin-top: 15px;
          color: #94a3b8;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Responsive */
        @media (max-width: 480px) {
          .card {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;