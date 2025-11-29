import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { orderApi, paymentApi } from '../api';

const CartPage = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    delivery_address: '',
    notes: '',
    payment_method: 'cod'
  });

  useEffect(() => {
    loadCart();
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      setFormData(prev => ({
        ...prev,
        delivery_address: user.address || ''
      }));
    }
  }, []);

  const loadCart = () => {
    const stored = JSON.parse(localStorage.getItem('drone_cart')) || [];
    setCart(stored);
  };

  const updateQuantity = (index, delta) => {
    const newCart = [...cart];
    newCart[index].quantity += delta;
    
    if (newCart[index].quantity <= 0) {
      newCart.splice(index, 1);
    }
    
    setCart(newCart);
    localStorage.setItem('drone_cart', JSON.stringify(newCart));
    window.dispatchEvent(new Event('cart-updated'));
  };

  const removeItem = (index) => {
    const newCart = cart.filter((_, i) => i !== index);
    setCart(newCart);
    localStorage.setItem('drone_cart', JSON.stringify(newCart));
    window.dispatchEvent(new Event('cart-updated'));
    toast.info('Đã xóa món');
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    
    if (!formData.delivery_address) {
      toast.error('Vui lòng nhập địa chỉ giao hàng');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        restaurant_id: cart[0].restaurant_id,
        delivery_address: formData.delivery_address,
        notes: formData.notes,
        items: cart
      };

      const orderRes = await orderApi.post('/orders', orderData);
      
      const paymentData = {
        order_id: orderRes.data.id,
        amount: calculateTotal(),
        payment_method: formData.payment_method
      };
      
      await paymentApi.post('/payments', paymentData);
      
      setCart([]);
      localStorage.setItem('drone_cart', JSON.stringify([]));
      window.dispatchEvent(new Event('cart-updated'));
      
      toast.success('Đặt hàng thành công! 🎉');
      navigate('/orders');
      
    } catch (error) {
      const msg = error.response?.data?.detail || 'Đặt hàng thất bại';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-gray-500">
        <ShoppingBag size={100} className="text-gray-300 mb-6" />
        <h2 className="text-2xl font-bold mb-2">Giỏ hàng trống</h2>
        <p className="mb-6">Hãy thêm món ăn vào giỏ hàng</p>
        <button 
          onClick={() => navigate('/restaurants')}
          className="bg-rose-500 text-white px-6 py-3 rounded-lg hover:bg-rose-600 transition"
        >
          Xem nhà hàng
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Giỏ hàng của bạn</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-md flex items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{item.product_name}</h3>
                  <p className="text-rose-500 font-semibold">
                    {new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'}).format(item.price)}
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => updateQuantity(index, -1)}
                    className="w-8 h-8 bg-gray-100 rounded-full hover:bg-gray-200 flex items-center justify-center"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="font-bold w-8 text-center">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(index, 1)}
                    className="w-8 h-8 bg-gray-100 rounded-full hover:bg-gray-200 flex items-center justify-center"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                
                <button 
                  onClick={() => removeItem(index)}
                  className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md h-fit sticky top-4">
            <h2 className="text-xl font-bold mb-4">Thông tin giao hàng</h2>
            
            <form onSubmit={handleCheckout} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Địa chỉ giao hàng *</label>
                <textarea 
                  value={formData.delivery_address}
                  onChange={(e) => setFormData({...formData, delivery_address: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                  rows="3"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <input 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                  placeholder="Ghi chú cho nhà hàng..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Phương thức thanh toán</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="payment" 
                      value="cod"
                      checked={formData.payment_method === 'cod'}
                      onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                      className="text-rose-500"
                    />
                    <span>Tiền mặt (COD)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="payment" 
                      value="card"
                      checked={formData.payment_method === 'card'}
                      onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                      className="text-rose-500"
                    />
                    <span>Thẻ tín dụng</span>
                  </label>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between mb-2">
                  <span>Tạm tính:</span>
                  <span className="font-semibold">
                    {new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'}).format(calculateTotal())}
                  </span>
                </div>
                <div className="flex justify-between mb-4">
                  <span>Phí giao hàng:</span>
                  <span className="text-green-600 font-semibold">Miễn phí</span>
                </div>
                <div className="flex justify-between text-xl font-bold border-t pt-4">
                  <span>Tổng cộng:</span>
                  <span className="text-rose-500">
                    {new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'}).format(calculateTotal())}
                  </span>
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-rose-500 text-white py-3 rounded-lg font-bold hover:bg-rose-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? 'Đang xử lý...' : 'Đặt hàng ngay'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;