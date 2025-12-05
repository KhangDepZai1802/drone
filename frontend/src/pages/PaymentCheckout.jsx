import React, { useState, useEffect } from 'react';
import { CreditCard, Wallet, DollarSign, CheckCircle, XCircle, Loader } from 'lucide-react';

const PaymentCheckout = ({ orderId, amount, onSuccess, onCancel }) => {
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);

  const paymentMethods = [
    { id: 'cod', name: 'Tiền mặt (COD)', icon: DollarSign, color: 'green' },
    { id: 'momo', name: 'Ví MoMo', icon: Wallet, color: 'pink' },
    { id: 'credit_card', name: 'Thẻ tín dụng', icon: CreditCard, color: 'blue' },
    { id: 'bank_transfer', name: 'Chuyển khoản', icon: CreditCard, color: 'purple' },
  ];

  const handlePayment = async () => {
    setProcessing(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      
      // Create payment
      const response = await fetch('http://localhost:8000/api/payments/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          order_id: orderId,
          amount: amount,
          payment_method: paymentMethod
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Thanh toán thất bại');
      }

      setPaymentDetails(data);

      // Check payment status
      if (data.status === 'completed') {
        setSuccess(true);
        setTimeout(() => {
          if (onSuccess) onSuccess(data);
        }, 2000);
      } else if (data.status === 'failed') {
        throw new Error('Thanh toán không thành công');
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
        <div className="text-center">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold text-green-600 mb-2">Thanh toán thành công!</h2>
          <p className="text-gray-600 mb-4">Đơn hàng của bạn đã được xác nhận</p>
          
          {paymentDetails && (
            <div className="bg-gray-50 rounded p-4 text-left mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Mã giao dịch:</span>
                <span className="font-semibold">{paymentDetails.transaction_id}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Số tiền:</span>
                <span className="font-semibold text-green-600">{amount.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phương thức:</span>
                <span className="font-semibold">
                  {paymentMethods.find(m => m.id === paymentMethod)?.name}
                </span>
              </div>
            </div>
          )}

          <button 
            onClick={() => window.location.href = '/orders'}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition"
          >
            Xem đơn hàng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6">Thanh toán</h2>

      {/* Amount */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <div className="text-sm text-gray-600 mb-1">Tổng thanh toán</div>
        <div className="text-3xl font-bold text-blue-600">
          {amount.toLocaleString('vi-VN')} đ
        </div>
      </div>

      {/* Payment Methods */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3">Chọn phương thức thanh toán</h3>
        <div className="space-y-2">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            const isSelected = paymentMethod === method.id;
            
            return (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                className={`w-full p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                  isSelected 
                    ? `border-${method.color}-500 bg-${method.color}-50` 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`p-2 rounded-full bg-${method.color}-100`}>
                  <Icon className={`w-5 h-5 text-${method.color}-600`} />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold">{method.name}</div>
                  {method.id === 'cod' && (
                    <div className="text-xs text-gray-500">Thanh toán khi nhận hàng</div>
                  )}
                </div>
                {isSelected && (
                  <CheckCircle className={`w-5 h-5 text-${method.color}-600`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-2">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Payment Info */}
      {paymentMethod !== 'cod' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="text-sm text-yellow-800">
            ⚠️ Đây là môi trường demo. Thanh toán sẽ được mô phỏng (95% thành công).
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={processing}
          className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50"
        >
          Hủy
        </button>
        <button
          onClick={handlePayment}
          disabled={processing}
          className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Đang xử lý...
            </>
          ) : (
            'Xác nhận thanh toán'
          )}
        </button>
      </div>

      {/* Order Info */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          Đơn hàng #{orderId}
        </div>
      </div>
    </div>
  );
};

export default PaymentCheckout;