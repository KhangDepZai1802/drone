import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Package, DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react';
import { productApi, orderApi } from '../api';

const RestaurantDashboard = () => {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([fetchProducts(), fetchOrders()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await productApi.get(`/products/restaurant/${user.id}`);
      setProducts(res.data);
    } catch (error) {
      toast.error('Lỗi tải sản phẩm');
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await orderApi.get('/orders');
      setOrders(res.data);
    } catch (error) {
      console.error('Error fetching orders');
    }
  };

  const toggleProductAvailability = async (productId, currentStatus) => {
    try {
      await productApi.put(`/products/${productId}`, {
        is_available: !currentStatus
      });
      toast.success('Đã cập nhật trạng thái');
      fetchProducts();
    } catch (error) {
      toast.error('Lỗi cập nhật');
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await orderApi.put(`/orders/${orderId}/status`, { status: newStatus });
      toast.success('Đã cập nhật đơn hàng');
      fetchOrders();
    } catch (error) {
      toast.error('Lỗi cập nhật đơn hàng');
    }
  };

  const acceptOrder = async (orderId) => {
    try {
      await orderApi.post(`/orders/${orderId}/accept`);
      toast.success('Đã nhận đơn hàng');
      fetchOrders();
    } catch (error) {
      toast.error('Lỗi nhận đơn');
    }
  };

  const rejectOrder = async (orderId) => {
    const reason = prompt('Lý do từ chối:', 'Hết nguyên liệu');
    if (!reason) return;
    
    try {
      await orderApi.post(`/orders/${orderId}/reject`, { reason });
      toast.success('Đã từ chối đơn hàng');
      fetchOrders();
    } catch (error) {
      toast.error('Lỗi từ chối đơn');
    }
  };

  const stats = {
    totalProducts: products.length,
    availableProducts: products.filter(p => p.is_available).length,
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'waiting_confirmation').length
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin text-6xl">⏳</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-rose-500 to-orange-400 text-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">{user.restaurant_name}</h1>
          <p>{user.restaurant_description}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <Package className="text-blue-600" size={24} />
              <span className="text-gray-500">Tổng món</span>
            </div>
            <p className="text-3xl font-bold">{stats.totalProducts}</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="text-green-600" size={24} />
              <span className="text-gray-500">Đang bán</span>
            </div>
            <p className="text-3xl font-bold">{stats.availableProducts}</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="text-purple-600" size={24} />
              <span className="text-gray-500">Đơn hàng</span>
            </div>
            <p className="text-3xl font-bold">{stats.totalOrders}</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="text-orange-600" size={24} />
              <span className="text-gray-500">Chờ xử lý</span>
            </div>
            <p className="text-3xl font-bold">{stats.pendingOrders}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-6 py-4 font-semibold transition ${
                activeTab === 'products' 
                  ? 'bg-rose-500 text-white' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Sản phẩm
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-6 py-4 font-semibold transition ${
                activeTab === 'orders' 
                  ? 'bg-rose-500 text-white' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Đơn hàng
            </button>
          </div>

          <div className="p-6">
            {/* Products Tab */}
            {activeTab === 'products' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {products.map(product => (
                  <div key={product.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition">
                    <div className="h-40 bg-gray-200">
                      <img 
                        src={product.image_url || 'https://placehold.co/400x300?text=Food'} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold mb-1">{product.name}</h3>
                      <p className="text-rose-500 font-semibold mb-2">
                        {new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'}).format(product.price)}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${product.is_available ? 'text-green-600' : 'text-red-600'}`}>
                          {product.is_available ? '✓ Đang bán' : '✗ Hết hàng'}
                        </span>
                        <button
                          onClick={() => toggleProductAvailability(product.id, product.is_available)}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {product.is_available ? 'Tắt' : 'Bật'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="border rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg">Đơn #{order.id}</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleString('vi-VN')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {order.status === 'waiting_confirmation' && (
                          <>
                            <button
                              onClick={() => acceptOrder(order.id)}
                              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                            >
                              ✓ Nhận
                            </button>
                            <button
                              onClick={() => rejectOrder(order.id)}
                              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                            >
                              ✗ Từ chối
                            </button>
                          </>
                        )}
                        {['confirmed', 'preparing'].includes(order.status) && (
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            className="border rounded-lg px-4 py-2"
                          >
                            <option value="confirmed">Đã xác nhận</option>
                            <option value="preparing">Đang chuẩn bị</option>
                            <option value="ready">Sẵn sàng</option>
                          </select>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg mb-3">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between py-1">
                          <span>{item.quantity}x {item.product_name}</span>
                          <span className="font-semibold">
                            {new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'}).format(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center border-t pt-3">
                      <span className="font-bold">Tổng:</span>
                      <span className="text-xl font-bold text-rose-500">
                        {new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'}).format(order.total_amount)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mt-2">
                      📍 {order.delivery_address}
                    </p>
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

export default RestaurantDashboard;