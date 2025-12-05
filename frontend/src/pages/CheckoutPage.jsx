import React, { useState, useEffect } from 'react';
import { ShoppingCart, MapPin, CreditCard, Truck, ArrowRight, AlertCircle } from 'lucide-react';

const CheckoutPage = () => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1); // 1: Cart, 2: Address, 3: Payment
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [createdOrders, setCreatedOrders] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/cart/cart', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setCart(data);
    } catch (err) {
      setError('Không thể tải giỏ hàng');
    } finally {
      setLoading(false);
    }
  };

  const getTotalAmount = () => {
    if (!cart?.items) return 0;
    return cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      
      // Prepare checkout data
      const prepareResponse = await fetch('http://localhost:8000/api/cart/cart/prepare', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!prepareResponse.ok) {
        throw new Error('Không thể chuẩn bị đơn hàng');
      }

      const preparedData = await prepareResponse.json();

      // Create checkout request
      const checkoutData = {
        items: preparedData.items.map(item => ({
          restaurant_id: item.restaurant_id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          price: item.price,
          weight: 0.5
        })),
        delivery_address: address,
        notes: notes,
        payment_method: paymentMethod
      };

      // Submit checkout
      const checkoutResponse = await fetch('http://localhost:8000/api/orders/orders/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(checkoutData)
      });

      if (!checkoutResponse.ok) {
        throw new Error('Đặt hàng thất bại');
      }

      const result = await checkoutResponse.json();
      setCreatedOrders(result.orders || []);
      setStep(4); // Success

      // Clear cart
      setTimeout(() => {
        window.location.href = '/orders';
      }, 3000);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !cart) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Đang tải...</div>
      </div>
    );
  }

  if (!cart?.items || cart.items.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <ShoppingCart className="w-20 h-20 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Giỏ hàng trống</h2>
        <p className="text-gray-500 mb-4">Hãy thêm món vào giỏ hàng</p>
        <button
          onClick={() => window.location.href = '/restaurants'}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Khám phá nhà hàng
        </button>
      </div>
    );
  }

  // Success Screen
  if (step === 4) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-green-600 mb-2">Đặt hàng thành công!</h2>
          <p className="text-gray-600 mb-6">
            Đơn hàng của bạn đã được gửi đến nhà hàng và sẽ sớm được giao
          </p>

          {createdOrders.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-2">Thông tin đơn hàng</h3>
              {createdOrders.map(order => (
                <div key={order.id} className="text-sm text-left mb-2">
                  <div className="flex justify-between">
                    <span>Đơn #{order.id}</span>
                    <span className="font-semibold">{order.total_amount.toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => window.location.href = '/orders'}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Xem đơn hàng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Thanh toán</h1>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {[
          { num: 1, name: 'Giỏ hàng', icon: ShoppingCart },
          { num: 2, name: 'Địa chỉ', icon: MapPin },
          { num: 3, name: 'Thanh toán', icon: CreditCard }
        ].map((s, idx) => (
          <React.Fragment key={s.num}>
            <div className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step >= s.num ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                <s.icon className="w-5 h-5" />
              </div>
              <span className={`ml-2 font-semibold ${step >= s.num ? 'text-blue-500' : 'text-gray-500'}`}>
                {s.name}
              </span>
            </div>
            {idx < 2 && (
              <div className={`flex-1 h-1 mx-4 ${step > s.num ? 'bg-blue-500' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Step 1: Cart Items */}
      {step === 1 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">Sản phẩm trong giỏ</h2>
          <div className="space-y-4 mb-6">
            {cart.items.map(item => (
              <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="flex-1">
                  <h3 className="font-semibold">{item.product_name}</h3>
                  <p className="text-sm text-gray-600">Số lượng: {item.quantity}</p>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">{(item.price * item.quantity).toLocaleString('vi-VN')} đ</div>
                  <div className="text-sm text-gray-500">{item.price.toLocaleString('vi-VN')} đ/món</div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xl font-bold">Tổng cộng:</span>
              <span className="text-2xl font-bold text-blue-600">
                {getTotalAmount().toLocaleString('vi-VN')} đ
              </span>
            </div>
            <button
              onClick={() => setStep(2)}
              className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 flex items-center justify-center gap-2"
            >
              Tiếp tục
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Delivery Address */}
      {step === 2 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">Địa chỉ giao hàng</h2>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block font-semibold mb-2">Địa chỉ *</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Nhập địa chỉ chi tiết..."
                className="w-full p-3 border rounded-lg"
                rows={3}
              />
            </div>
            <div>
              <label className="block font-semibold mb-2">Ghi chú (tùy chọn)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ghi chú cho đơn hàng..."
                className="w-full p-3 border rounded-lg"
                rows={2}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
            >
              Quay lại
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!address.trim()}
              className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Tiếp tục
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Payment */}
      {step === 3 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">Phương thức thanh toán</h2>
          
          <div className="space-y-3 mb-6">
            {[
              { id: 'cod', name: 'Tiền mặt khi nhận hàng' },
              { id: 'momo', name: 'Ví MoMo' },
              { id: 'credit_card', name: 'Thẻ tín dụng/ghi nợ' }
            ].map(method => (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                className={`w-full p-4 border-2 rounded-lg text-left transition ${
                  paymentMethod === method.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 ${
                    paymentMethod === method.id
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  } flex items-center justify-center`}>
                    {paymentMethod === method.id && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <span className="font-semibold">{method.name}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-3">Tóm tắt đơn hàng</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Số món:</span>
                <span className="font-semibold">{cart.items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Địa chỉ:</span>
                <span className="font-semibold">{address.substring(0, 30)}...</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-bold">Tổng:</span>
                <span className="font-bold text-blue-600 text-lg">
                  {getTotalAmount().toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
            >
              Quay lại
            </button>
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="flex-1 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? 'Đang xử lý...' : 'Đặt hàng'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;