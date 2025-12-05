import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import {
  Plane, Battery, MapPin, Settings, AlertCircle, Zap,
  RotateCcw, Wrench, Plus, Trash2, Check, X, Eye, Map, Pause
} from 'lucide-react';
import { orderApi } from '../api';

// Leaflet
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const DroneManagementDashboard = () => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  const [drones, setDrones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDrone, setSelectedDrone] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [newDrone, setNewDrone] = useState({
    name: '',
    model: '',
    max_payload: 5.0,
    max_distance_km: 20.0,
    base_lat: 10.762622,
    base_lng: 106.660172,
  });

  // Fetch drones
  const fetchDrones = async () => {
    try {
      setLoading(true);
      const res = await orderApi.get('/drones');
      setDrones(res.data);
      updateMapMarkers(res.data);
    } catch (error) {
      console.error('Error fetching drones:', error);
      toast.error('Không thể tải danh sách drone');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrones();
    
    // Refresh every 5 seconds
    const interval = setInterval(fetchDrones, 5000);
    return () => clearInterval(interval);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapInstanceRef.current && mapRef.current && drones.length > 0) {
      const avgLat = drones.reduce((sum, d) => sum + d.current_lat, 0) / drones.length;
      const avgLng = drones.reduce((sum, d) => sum + d.current_lng, 0) / drones.length;

      const map = L.map(mapRef.current).setView([avgLat, avgLng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    if (mapInstanceRef.current) {
      updateMapMarkers(drones);
    }
  }, [drones, mapRef]);

  const updateMapMarkers = (dronesList) => {
    if (!mapInstanceRef.current) return;

    // Clear old markers
    Object.values(markersRef.current).forEach(marker => {
      mapInstanceRef.current.removeLayer(marker);
    });
    markersRef.current = {};

    // Add new markers
    dronesList.forEach(drone => {
      const color = drone.status === 'idle' ? 'green' : drone.status === 'in_delivery' ? 'blue' : 'orange';
      const icon = L.icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-${color}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const marker = L.marker([drone.current_lat, drone.current_lng], { icon })
        .addTo(mapInstanceRef.current)
        .bindPopup(
          `<b>${drone.name}</b><br/>
           Status: ${drone.status}<br/>
           Battery: ${drone.battery_level.toFixed(1)}%`
        );

      markersRef.current[drone.id] = marker;
    });

    // Fit bounds
    if (Object.keys(markersRef.current).length > 0) {
      const group = new L.featureGroup(Object.values(markersRef.current));
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
    }
  };

  // Create drone
  const handleCreateDrone = async () => {
    if (!newDrone.name) {
      toast.error('Nhập tên drone');
      return;
    }

    try {
      await orderApi.post('/drones', newDrone);
      toast.success('✅ Tạo drone thành công');
      setNewDrone({
        name: '',
        model: '',
        max_payload: 5.0,
        max_distance_km: 20.0,
        base_lat: 10.762622,
        base_lng: 106.660172,
      });
      setShowModal(false);
      fetchDrones();
    } catch (error) {
      toast.error('❌ Lỗi tạo drone');
    }
  };

  // Charge drone
  const handleCharge = async (droneId) => {
    try {
      await orderApi.post(`/drones/${droneId}/charge`);
      toast.success('✅ Sạc drone thành công');
      fetchDrones();
    } catch (error) {
      toast.error('❌ Lỗi sạc drone');
    }
  };

  // Maintenance
  const handleMaintenance = async (droneId) => {
    try {
      await orderApi.post(`/drones/${droneId}/maintenance`);
      toast.success('✅ Đưa drone vào bảo trì');
      fetchDrones();
    } catch (error) {
      toast.error('❌ Lỗi cập nhật trạng thái');
    }
  };

  // Return drone
  const handleReturn = async (droneId) => {
    try {
      await orderApi.post(`/drones/${droneId}/return`);
      toast.success('✅ Gọi drone quay về');
      fetchDrones();
    } catch (error) {
      toast.error('❌ Lỗi gọi drone quay về');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      idle: { bg: 'bg-green-100', text: 'text-green-800', icon: '⏸️', label: 'Rảnh' },
      in_delivery: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '📦', label: 'Đang giao' },
      returning: { bg: 'bg-purple-100', text: 'text-purple-800', icon: '🔄', label: 'Quay về' },
      charging: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '🔌', label: 'Sạc' },
      maintenance: { bg: 'bg-red-100', text: 'text-red-800', icon: '🔧', label: 'Bảo trì' },
    };
    const badge = badges[status] || badges.idle;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-bold text-sm ${badge.bg} ${badge.text}`}>
        {badge.icon} {badge.label}
      </span>
    );
  };

  const getBatteryColor = (battery) => {
    if (battery > 70) return 'bg-green-500';
    if (battery > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">🚁</div>
          <p className="text-gray-500">Đang tải dữ liệu drone...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Plane size={40} />
            Quản lý Drone Fleet
          </h1>
          <p className="text-blue-100">
            Đang hoạt động: {drones.filter(d => d.status !== 'idle').length} / {drones.length} drone
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <Plane className="text-blue-600" size={24} />
              <span className="text-gray-500 text-sm">Tổng Drone</span>
            </div>
            <p className="text-3xl font-bold">{drones.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="text-green-600" size={24} />
              <span className="text-gray-500 text-sm">Đang hoạt động</span>
            </div>
            <p className="text-3xl font-bold">{drones.filter(d => d.status === 'idle').length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <Battery className="text-yellow-600" size={24} />
              <span className="text-gray-500 text-sm">Cần sạc</span>
            </div>
            <p className="text-3xl font-bold">{drones.filter(d => d.battery_level < 30).length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <Wrench className="text-red-600" size={24} />
              <span className="text-gray-500 text-sm">Bảo trì</span>
            </div>
            <p className="text-3xl font-bold">{drones.filter(d => d.status === 'maintenance').length}</p>
          </div>
        </div>

        {/* Map + Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Map */}
          <div className="lg:col-span-2">
            <div ref={mapRef} className="w-full h-96 rounded-2xl shadow-lg border-4 border-white" />
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <button
              onClick={() => setShowModal(true)}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-xl font-bold hover:shadow-lg transition flex items-center justify-center gap-2"
            >
              <Plus size={24} />
              Thêm Drone Mới
            </button>

            <button
              onClick={() => setShowMapModal(true)}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-xl font-bold hover:shadow-lg transition flex items-center justify-center gap-2"
            >
              <Map size={24} />
              Xem Map Toàn Hệ
            </button>

            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="font-bold mb-4 text-sm uppercase text-gray-500">Thống kê Pin</h3>
              {drones.map(d => (
                <div key={d.id} className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold">{d.name}</span>
                    <span className={`font-bold ${d.battery_level > 50 ? 'text-green-600' : 'text-red-600'}`}>
                      {d.battery_level.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getBatteryColor(d.battery_level)}`}
                      style={{ width: `${d.battery_level}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Drone List */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold">Chi tiết Fleet</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-bold">Tên Drone</th>
                  <th className="px-6 py-3 text-left text-sm font-bold">Model</th>
                  <th className="px-6 py-3 text-left text-sm font-bold">Trạng thái</th>
                  <th className="px-6 py-3 text-left text-sm font-bold">Pin</th>
                  <th className="px-6 py-3 text-left text-sm font-bold">Vị trí</th>
                  <th className="px-6 py-3 text-left text-sm font-bold">Tải Trọng</th>
                  <th className="px-6 py-3 text-left text-sm font-bold">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {drones.map((drone) => (
                  <tr key={drone.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-lg">🚁 {drone.name}</div>
                      <div className="text-xs text-gray-500">ID: {drone.id}</div>
                    </td>
                    <td className="px-6 py-4 text-sm">{drone.model || '-'}</td>
                    <td className="px-6 py-4">{getStatusBadge(drone.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getBatteryColor(drone.battery_level)}`}
                            style={{ width: `${drone.battery_level}%` }}
                          />
                        </div>
                        <span className="font-bold text-sm w-12 text-right">
                          {drone.battery_level.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-600">
                        <div>{drone.current_lat.toFixed(4)}</div>
                        <div>{drone.current_lng.toFixed(4)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold">
                      {drone.max_payload} kg
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {drone.battery_level < 30 && (
                          <button
                            onClick={() => handleCharge(drone.id)}
                            className="px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-xs font-bold flex items-center gap-1"
                            title="Sạc"
                          >
                            <Zap size={16} />
                            Sạc
                          </button>
                        )}
                        {drone.status !== 'maintenance' && (
                          <button
                            onClick={() => handleMaintenance(drone.id)}
                            className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-xs font-bold flex items-center gap-1"
                            title="Bảo trì"
                          >
                            <Wrench size={16} />
                          </button>
                        )}
                        {drone.status === 'in_delivery' && (
                          <button
                            onClick={() => handleReturn(drone.id)}
                            className="px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-xs font-bold flex items-center gap-1"
                            title="Quay về"
                          >
                            <RotateCcw size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedDrone(drone)}
                          className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-xs font-bold flex items-center gap-1"
                          title="Chi tiết"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Drone Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <h2 className="text-2xl font-bold mb-6">Thêm Drone Mới</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Tên Drone"
                value={newDrone.name}
                onChange={(e) => setNewDrone({ ...newDrone, name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="Model"
                value={newDrone.model}
                onChange={(e) => setNewDrone({ ...newDrone, model: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <input
                type="number"
                placeholder="Tải trọng max (kg)"
                value={newDrone.max_payload}
                onChange={(e) => setNewDrone({ ...newDrone, max_payload: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <input
                type="number"
                placeholder="Quãng đường tối đa (km)"
                value={newDrone.max_distance_km}
                onChange={(e) => setNewDrone({ ...newDrone, max_distance_km: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleCreateDrone}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700"
                >
                  Tạo
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-300 py-2 rounded-lg font-bold hover:bg-gray-400"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drone Details Modal */}
      {selectedDrone && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 max-h-96 overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Chi tiết {selectedDrone.name}</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-gray-500 text-sm">Model</p>
                <p className="text-lg font-bold">{selectedDrone.model}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Trạng thái</p>
                <p className="mt-1">{getStatusBadge(selectedDrone.status)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Pin</p>
                <p className="text-lg font-bold">{selectedDrone.battery_level.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Tải trọng</p>
                <p className="text-lg font-bold">{selectedDrone.max_payload} kg</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Quãng đường tối đa</p>
                <p className="text-lg font-bold">{selectedDrone.max_distance_km} km</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Tổng quãng đường</p>
                <p className="text-lg font-bold">{selectedDrone.total_distance_traveled.toFixed(1)} km</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedDrone(null)}
              className="w-full mt-6 bg-gray-300 py-2 rounded-lg font-bold hover:bg-gray-400"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DroneManagementDashboard;