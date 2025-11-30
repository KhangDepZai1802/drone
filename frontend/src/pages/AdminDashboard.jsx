import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Users, Store, Package, Plane, ShieldCheck } from 'lucide-react';
import { userApi, orderApi } from '../api';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  
  const [users, setUsers] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [orders, setOrders] = useState([]);
  const [drones, setDrones] = useState([]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // [FIX] Gọi đúng endpoints
      const [usersRes, restaurantsRes, ordersRes, dronesRes] = await Promise.all([
        userApi.get('/users'),           // GET /api/users/users
        userApi.get('/restaurants'),     // GET /api/users/restaurants
        orderApi.get('/orders'),         // GET /api/orders/orders
        orderApi.get('/drones'),         // GET /api/orders/drones
      ]);

      setUsers(usersRes.data);
      setRestaurants(restaurantsRes.data);
      setOrders(ordersRes.data);
      setDrones(dronesRes.data);
    } catch (error) {
      console.error("Lỗi tải dữ liệu Admin:", error);
      toast.error('Không thể tải dữ liệu từ Server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const stats = {
    totalUsers: users.length,
    totalRestaurants: restaurants.length,
    totalOrders: orders.length,
    totalDrones: drones.length
  };

  const getRoleBadge = (role) => {
    const colors = { 
      admin: 'bg-red-100 text-red-800', 
      restaurant: 'bg-orange-100 text-orange-800', 
      customer: 'bg-green-100 text-green-800' 
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[role] || 'bg-gray-100'}`}>
        {role ? role.toUpperCase() : 'N/A'}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const colors = { 
      idle: 'bg-green-100 text-green-800', 
      in_use: 'bg-blue-100 text-blue-800', 
      charging: 'bg-yellow-100 text-yellow-800', 
      maintenance: 'bg-red-100 text-red-800' 
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-bold ${colors[status] || 'bg-gray-100'}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-500">Đang tải dữ liệu hệ thống...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 to-indigo-700 text-white py-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
             <ShieldCheck size={40} /> Admin Dashboard
          </h1>
          <p className="opacity-90">Hệ thống quản trị trung tâm DroneFood</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 -mt-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-500 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-bold uppercase">Người dùng</p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalUsers}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full text-blue-600"><Users size={24} /></div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-orange-500 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-bold uppercase">Nhà hàng</p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalRestaurants}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full text-orange-600"><Store size={24} /></div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-bold uppercase">Đơn hàng</p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalOrders}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full text-green-600"><Package size={24} /></div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-purple-500 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-bold uppercase">Drones</p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalDrones}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full text-purple-600"><Plane size={24} /></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 mt-10">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="flex border-b overflow-x-auto">
             {['users', 'restaurants', 'orders', 'drones'].map(tab => (
               <button 
                 key={tab}
                 onClick={() => setActiveTab(tab)}
                 className={`px-6 py-4 font-bold text-sm uppercase tracking-wide transition ${
                   activeTab === tab ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'
                 }`}
               >
                 {tab === 'users' && 'Người dùng'}
                 {tab === 'restaurants' && 'Nhà hàng'}
                 {tab === 'orders' && 'Đơn hàng'}
                 {tab === 'drones' && 'Drones'}
               </button>
             ))}
          </div>

          <div className="p-6 overflow-x-auto">
            {/* USERS TAB */}
            {activeTab === 'users' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-gray-500 border-b">
                    <th className="py-3">ID</th>
                    <th className="py-3">Họ tên</th>
                    <th className="py-3">Email</th>
                    <th className="py-3">Vai trò</th>
                    <th className="py-3">Ngày tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 font-bold">#{u.id}</td>
                      <td className="py-3 font-medium">{u.full_name || u.username}</td>
                      <td className="py-3 text-gray-600">{u.email}</td>
                      <td className="py-3">{getRoleBadge(u.role)}</td>
                      <td className="py-3 text-sm text-gray-500">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* RESTAURANTS TAB */}
            {activeTab === 'restaurants' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {restaurants.map(r => (
                   <div key={r.id} className="border rounded-lg p-4 flex justify-between items-center hover:shadow-md transition">
                      <div>
                        <h3 className="font-bold text-lg">{r.restaurant_name}</h3>
                        <p className="text-gray-500 text-sm">📍 {r.city || 'N/A'}</p>
                        <p className="text-gray-400 text-xs mt-1 line-clamp-1">
                          {r.restaurant_description}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                        r.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {r.is_active ? 'Hoạt động' : 'Đóng cửa'}
                      </div>
                   </div>
                 ))}
              </div>
            )}

            {/* ORDERS TAB */}
            {activeTab === 'orders' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-gray-500 border-b">
                    <th className="py-3">Mã đơn</th>
                    <th className="py-3">Khách (ID)</th>
                    <th className="py-3">Tổng tiền</th>
                    <th className="py-3">Trạng thái</th>
                    <th className="py-3">Ngày đặt</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 font-bold">#{o.id}</td>
                      <td className="py-3">User #{o.user_id}</td>
                      <td className="py-3 font-bold text-rose-600">
                        {parseInt(o.total_amount).toLocaleString()}đ
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs uppercase font-bold ${
                          o.status === 'delivered' ? 'bg-green-100 text-green-700' : 
                          o.status === 'in_delivery' ? 'bg-blue-100 text-blue-700' : 
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-gray-500">
                        {new Date(o.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* DRONES TAB */}
            {activeTab === 'drones' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {drones.map(d => (
                  <div key={d.id} className="border rounded-xl p-5 hover:shadow-lg transition relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-indigo-50 p-3 rounded-lg">
                        <Plane className="text-indigo-600" size={24} />
                      </div>
                      {getStatusBadge(d.status)}
                    </div>
                    <h3 className="font-bold text-lg">{d.name}</h3>
                    <p className="text-gray-500 text-sm mb-4">{d.model}</p>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500">Pin</span>
                          <span className="font-bold">{d.battery_level}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              d.battery_level > 50 ? 'bg-green-500' : 
                              d.battery_level > 20 ? 'bg-yellow-500' : 
                              'bg-red-500'
                            }`} 
                            style={{width: `${d.battery_level}%`}}
                          ></div>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t">
                        <span className="text-gray-500">Tải trọng tối đa:</span>
                        <span className="font-bold">{d.max_payload} kg</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;