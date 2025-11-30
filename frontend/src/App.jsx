import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, LogOut, Zap, ShieldCheck, Plane } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- IMPORT CÁC TRANG TỪ THƯ MỤC PAGES ---
// (Đảm bảo bạn đã tạo đủ 5 file này trong folder pages)
import RestaurantDetail from './pages/RestaurantDetail';
import CartPage from './pages/CartPage';
import OrdersPage from './pages/OrdersPage';
import AdminDashboard from './pages/AdminDashboard';
import RestaurantDashboard from './pages/RestaurantDashboard';

// --- IMPORT API ---
import { userApi, getImageUrl } from './api';

// ==========================================
// CÁC COMPONENT CŨ (Vẫn giữ ở đây vì chưa tách file)
// ==========================================

const Navbar = ({ user, cartCount, onLogout }) => {
  const isAdmin = user?.role === 'admin';
  const isRestaurant = user?.role === 'restaurant';
  const isCustomer = !isAdmin && !isRestaurant;

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
            
            {isCustomer && (
              <>
                <Link to="/restaurants" className="text-gray-600 hover:text-primary font-medium">Nhà hàng</Link>
                {user && <Link to="/orders" className="text-gray-600 hover:text-primary font-medium">Đơn hàng</Link>}
              </>
            )}
            
            {user ? (
              <div className="flex items-center gap-4">
                {isAdmin && (
                   <Link to="/admin" className="text-blue-700 font-bold bg-blue-50 px-3 py-1 rounded border border-blue-200">
                     🛡️ Admin
                   </Link>
                )}
                {isRestaurant && (
                   <Link to="/restaurant-dashboard" className="text-green-700 font-bold bg-green-50 px-3 py-1 rounded border border-green-200">
                     🏪 Quản lý
                   </Link>
                )}
                
                {isCustomer && (
                  <Link to="/cart" className="relative p-2 text-gray-600 hover:text-primary transition">
                    <ShoppingCart size={24} />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                )}

                <div className="flex items-center gap-2 border-l pl-4 ml-2">
                  <div className="hidden md:flex flex-col text-right mr-1">
                    <span className="text-sm font-semibold">{user.full_name || user.username}</span>
                  </div>
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

const HomePage = () => (
  <div className="animate-fade-in">
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
    <div className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-10">
        <div className="p-8 bg-gray-50 rounded-2xl hover:shadow-lg transition text-center">
            <Zap size={32} className="mx-auto text-blue-600 mb-4" />
            <h3 className="text-xl font-bold">Siêu tốc độ</h3>
        </div>
        <div className="p-8 bg-gray-50 rounded-2xl hover:shadow-lg transition text-center">
            <ShieldCheck size={32} className="mx-auto text-green-600 mb-4" />
            <h3 className="text-xl font-bold">An toàn</h3>
        </div>
        <div className="p-8 bg-gray-50 rounded-2xl hover:shadow-lg transition text-center">
            <Plane size={32} className="mx-auto text-purple-600 mb-4" />
            <h3 className="text-xl font-bold">Công nghệ cao</h3>
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

      const res = await authApi.login(username, password);
      
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
        <h2 className="text-3xl font-bold text-center mb-8">Đăng nhập</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input className="w-full px-4 py-3 rounded-lg border" placeholder="Tên đăng nhập" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <input className="w-full px-4 py-3 rounded-lg border" type="password" placeholder="Mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-rose-600 transition">Đăng nhập</button>
        </form>
        <p className="mt-4 text-center"><Link to="/register" className="text-primary">Đăng ký ngay</Link></p>
      </div>
    </div>
  );
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', password: '', email: '', full_name: '', phone: '', address: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await userApi.post('/register', formData);
      toast.success('Đăng ký thành công!');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Đăng ký thất bại');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-100 py-10">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg">
        <h2 className="text-3xl font-bold text-center mb-6">Đăng ký</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
           <input className="w-full p-2 border rounded" placeholder="Họ tên" onChange={e => setFormData({...formData, full_name: e.target.value})} required />
           <input className="w-full p-2 border rounded" placeholder="Email" type="email" onChange={e => setFormData({...formData, email: e.target.value})} required />
           <input className="w-full p-2 border rounded" placeholder="Username" onChange={e => setFormData({...formData, username: e.target.value})} required />
           <input className="w-full p-2 border rounded" placeholder="Password" type="password" onChange={e => setFormData({...formData, password: e.target.value})} required />
           <input className="w-full p-2 border rounded" placeholder="SĐT" onChange={e => setFormData({...formData, phone: e.target.value})} required />
           <textarea className="w-full p-2 border rounded" placeholder="Địa chỉ" onChange={e => setFormData({...formData, address: e.target.value})} required />
           <button className="w-full bg-primary text-white py-3 rounded font-bold">Đăng ký</button>
        </form>
      </div>
    </div>
  );
};

const RestaurantsPage = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userApi.get('/restaurants').then(res => {
      setRestaurants(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-20 text-center">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-8">🍽️ Danh sách Nhà hàng</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {restaurants.map(res => (
          <Link to={`/restaurant/${res.id}`} key={res.id} className="block group">
            <div className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition">
              <div className="h-48 overflow-hidden">
                 <img src={getImageUrl(res.restaurant_image)} className="w-full h-full object-cover" onError={(e) => e.target.src = 'https://placehold.co/400x300'} />
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg group-hover:text-primary">{res.restaurant_name}</h3>
                <p className="text-gray-500 text-sm truncate">{res.restaurant_description}</p>
                <p className="text-xs text-gray-400 mt-2">📍 {res.city || 'TP.HCM'}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// MAIN APP COMPONENT
// ==========================================

function App() {
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
    
    // Hàm load lại giỏ hàng
    const loadCart = () => {
       const storedCart = localStorage.getItem('drone_cart');
       if (storedCart) setCart(JSON.parse(storedCart));
    };
    
    // Load lần đầu
    loadCart();
    
    // Lắng nghe sự kiện update từ các component khác
    window.addEventListener('cart-updated', loadCart);
    return () => window.removeEventListener('cart-updated', loadCart);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-800">
      <ToastContainer position="top-right" autoClose={3000} />
      <Navbar user={user} cartCount={cart.reduce((a,b) => a+b.quantity, 0)} onLogout={handleLogout} />
      
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage onLogin={setUser} />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/restaurants" element={<RestaurantsPage />} />
          
          {/* CÁC PAGE TỪ FILE RIÊNG */}
          <Route path="/restaurant/:id" element={<RestaurantDetail />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/restaurant-dashboard" element={<RestaurantDashboard />} />
        </Routes>
      </main>

      <footer className="bg-gray-800 text-gray-400 py-8 text-center">
        <p>© 2025 Drone Food Delivery</p>
      </footer>
    </div>
  );
}

export default App;