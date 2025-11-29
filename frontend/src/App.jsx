import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, LogOut, Zap, ShieldCheck, Plane } from 'lucide-react';
import { toast } from 'react-toastify';
import { userApi, getImageUrl } from './api';

// --- COMPONENTS CON ---

const Navbar = ({ user, cartCount, onLogout }) => {
  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center cursor-pointer">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-3xl">🚁</span>
              <span className="font-bold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-primary to-rose-600">
                DroneFood
              </span>
            </Link>
          </div>
          <div className="flex items-center space-x-6">
            <Link to="/" className="text-gray-600 hover:text-primary font-medium">Trang chủ</Link>
            <Link to="/restaurants" className="text-gray-600 hover:text-primary font-medium">Nhà hàng</Link>
            {user && <Link to="/orders" className="text-gray-600 hover:text-primary font-medium">Đơn hàng</Link>}
            
            {user ? (
              <div className="flex items-center gap-4">
                {user.role === 'admin' && (
                   <Link to="/admin" className="text-blue-600 font-bold">Admin</Link>
                )}
                {user.role === 'restaurant' && (
                   <Link to="/restaurant-dashboard" className="text-green-600 font-bold">Quản lý Quán</Link>
                )}
                
                <Link to="/cart" className="relative p-2 text-gray-600 hover:text-primary transition">
                  <ShoppingCart size={24} />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </Link>
                <div className="flex items-center gap-2 border-l pl-4 ml-2">
                  <span className="text-sm font-semibold">{user.full_name || user.username}</span>
                  <button onClick={onLogout} className="text-gray-400 hover:text-red-500">
                    <LogOut size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <Link to="/login" className="px-4 py-2 text-primary border border-primary rounded-lg hover:bg-red-50 transition">Đăng nhập</Link>
                <Link to="/register" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-red-600 shadow-lg shadow-red-200 transition">Đăng ký</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

// --- PAGES ---

const HomePage = () => (
  <div className="animate-fade-in">
    {/* Hero */}
    <div className="relative bg-gradient-to-br from-rose-500 to-orange-400 text-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 py-24 flex flex-col md:flex-row items-center">
        <div className="md:w-1/2 z-10">
          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-6">
            Giao đồ ăn siêu tốc <br/> bằng <span className="text-yellow-300">Drone</span>
          </h1>
          <p className="text-xl mb-8 text-white/90">Trải nghiệm công nghệ giao hàng tương lai. Nóng hổi, an toàn và chỉ mất 15 phút.</p>
          <Link to="/restaurants" className="px-8 py-4 bg-white text-rose-500 font-bold rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition transform">
            Đặt món ngay 🚀
          </Link>
        </div>
        <div className="md:w-1/2 flex justify-center mt-10 md:mt-0 relative">
          <div className="text-[150px] animate-bounce-slow">🚁</div>
        </div>
      </div>
    </div>

    {/* Features */}
    <div className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-10">
        <div className="p-8 bg-gray-50 rounded-2xl hover:shadow-lg transition text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap size={32} />
          </div>
          <h3 className="text-xl font-bold mb-2">Siêu tốc độ</h3>
          <p className="text-gray-500">Giao hàng đường hàng không, không lo kẹt xe.</p>
        </div>
        <div className="p-8 bg-gray-50 rounded-2xl hover:shadow-lg transition text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} />
          </div>
          <h3 className="text-xl font-bold mb-2">An toàn tuyệt đối</h3>
          <p className="text-gray-500">Quy trình khép kín, đảm bảo vệ sinh thực phẩm.</p>
        </div>
        <div className="p-8 bg-gray-50 rounded-2xl hover:shadow-lg transition text-center">
          <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plane size={32} />
          </div>
          <h3 className="text-xl font-bold mb-2">Công nghệ cao</h3>
          <p className="text-gray-500">Theo dõi lộ trình Drone theo thời gian thực.</p>
        </div>
      </div>
    </div>
  </div>
);

const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      
      const res = await userApi.post('/token', formData);
      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      onLogin(res.data.user);
      toast.success('Đăng nhập thành công!');
      
      if (res.data.user.role === 'admin') navigate('/admin');
      else if (res.data.user.role === 'restaurant') navigate('/restaurant-dashboard');
      else navigate('/');
    } catch (err) {
      toast.error('Sai tài khoản hoặc mật khẩu');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">Đăng nhập</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            <input 
              type="password" 
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" className="w-full bg-primary text-white py-3 rounded-lg font-bold text-lg hover:bg-rose-600 transition shadow-lg shadow-rose-200">
            Đăng nhập
          </button>
        </form>
        <p className="mt-6 text-center text-gray-600">
          Chưa có tài khoản? <Link to="/register" className="text-primary font-semibold hover:underline">Đăng ký ngay</Link>
        </p>
      </div>
    </div>
  );
};

// [MỚI] TRANG ĐĂNG KÝ HOÀN CHỈNH
const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    full_name: '',
    phone: '',
    address: ''
  });

  const handleChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Gọi API Register (Backend đã sửa để role mặc định là customer)
      await userApi.post('/register', formData);
      toast.success('Đăng ký thành công! Vui lòng đăng nhập.');
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Đăng ký thất bại';
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-100 py-12">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg">
        <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">Đăng ký tài khoản</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên</label>
              <input name="full_name" type="text" required
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none"
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
              <input name="phone" type="tel" required
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none"
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input name="email" type="email" required
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none"
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập</label>
            <input name="username" type="text" required
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none"
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            <input name="password" type="password" required minLength={6}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none"
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
            <textarea name="address" rows="2"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none"
              onChange={handleChange}
            ></textarea>
          </div>

          <button type="submit" className="w-full bg-primary text-white py-3 rounded-lg font-bold text-lg hover:bg-rose-600 transition shadow-lg mt-4">
            Đăng ký ngay
          </button>
        </form>
        <p className="mt-6 text-center text-gray-600">
          Đã có tài khoản? <Link to="/login" className="text-primary font-semibold hover:underline">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
};

const RestaurantsPage = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRes = async () => {
      try {
        const res = await userApi.get('/restaurants');
        setRestaurants(res.data);
      } catch (err) {
        toast.error('Lỗi tải nhà hàng');
      } finally {
        setLoading(false);
      }
    };
    fetchRes();
  }, []);

  if (loading) return <div className="p-20 text-center"><div className="animate-spin text-4xl">⏳</div></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-8">🍽️ Danh sách Nhà hàng</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {restaurants.map(res => (
          <Link to={`/restaurant/${res.id}`} key={res.id} className="block group">
            <div className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition duration-300 transform hover:-translate-y-1">
              <div className="h-48 bg-gray-200 overflow-hidden">
                <img 
                  src={getImageUrl(res.restaurant_image)} 
                  alt={res.restaurant_name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                  onError={(e) => e.target.src = 'https://placehold.co/400x300?text=Restaurant'}
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition">{res.restaurant_name}</h3>
                <p className="text-gray-500 text-sm line-clamp-2">{res.restaurant_description}</p>
                <div className="mt-4 flex items-center text-sm text-gray-400">
                  <span>📍 {res.city || 'TP.HCM'}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

// --- MAIN APP ---

function App() {
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
    const storedCart = localStorage.getItem('drone_cart');
    if (storedCart) setCart(JSON.parse(storedCart));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-800">
      <Navbar user={user} cartCount={cart.reduce((a,b) => a+b.quantity, 0)} onLogout={handleLogout} />
      
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage onLogin={setUser} />} />
          <Route path="/register" element={<RegisterPage />} /> {/* Đã thêm trang Register */}
          <Route path="/restaurants" element={<RestaurantsPage />} />
          <Route path="/restaurant/:id" element={<div className="p-20 text-center">Trang Chi tiết (Cần làm thêm)</div>} />
          <Route path="/cart" element={<div className="p-20 text-center">Trang Giỏ hàng (Cần làm thêm)</div>} />
          <Route path="/admin" element={<div className="p-20 text-center">Admin Dashboard</div>} />
          <Route path="/restaurant-dashboard" element={<div className="p-20 text-center">Restaurant Dashboard</div>} />
        </Routes>
      </main>

      <footer className="bg-gray-800 text-gray-400 py-8 text-center">
        <p>© 2025 Drone Food Delivery</p>
      </footer>
    </div>
  );
}

export default App;