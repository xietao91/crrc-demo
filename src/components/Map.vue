<template>
  <div class="map-wrapper">
    <a-auto-complete
      v-model:value="searchValue"
      :options="options"
      :style="{ width: '300px', marginBottom: '16px' }"
      placeholder="请输入地址关键词搜索"
      @select="onSelect"
      @search="debounceOnSearch"
      allowClear
    />

    <div ref="mapRef" class="map-container">
      <div ref="popupRef" class="ol-popup" v-show="popupShow">
        <div class="popup-content">
          <p><strong>经纬度：</strong><br/>{{ lonLatText }}</p>
          <p><strong>详细地址：</strong><br/>{{ addressInfo }}</p>
        </div>
        <div class="popup-arrow"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { message } from 'ant-design-vue';
import 'ant-design-vue/dist/antd.css';

// OpenLayers 引入
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { fromLonLat, toLonLat } from 'ol/proj';
import Overlay from 'ol/Overlay';
import { Zoom, Control } from 'ol/control'; // 引入控件类

// --- 响应式数据 ---
const mapRef = ref(null);
const popupRef = ref(null);
const searchValue = ref('');
const options = ref([]);
const popupShow = ref(false);
const lonLatText = ref('');
const addressInfo = ref('');

let map = null;
let overlay = null;

// 高德地图 KEY
const GAODE_WEB_KEY = '77e981c13f41f780fb6fd888dc73a5ec';

// --- 自定义定位控件类 ---
class GeolocationControl extends Control {
  constructor(opt_options) {
    const options = opt_options || {};
    
    // 创建按钮元素
    const button = document.createElement('button');
    button.innerHTML = '🎯'; // 定位图标
    button.title = '获取当前位置';

    const element = document.createElement('div');
    element.className = 'ol-get-location ol-unselectable ol-control';
    element.appendChild(button);

    super({
      element: element,
      target: options.target,
    });

    button.addEventListener('click', this.handleGetLocation.bind(this), false);
  }

  handleGetLocation() {
    if (!navigator.geolocation) {
      message.error('您的浏览器不支持地理定位');
      return;
    }

    message.loading({ content: '正在获取当前位置...', key: 'locating' });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        message.success({ content: '定位成功', key: 'locating', duration: 2 });
        const { longitude, latitude } = position.coords;
        const coordinate = fromLonLat([longitude, latitude]);

        // 1. 移动视角
        this.getMap().getView().animate({ center: coordinate, zoom: 16, duration: 500 });
        // 2. 显示弹窗
        showPopup(coordinate, longitude, latitude);
      },
      (err) => {
        message.error({ content: '定位失败，请检查浏览器权限', key: 'locating', duration: 2 });
        console.error(err);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }
}

// --- 初始化地图 ---
const initMap = () => {
  // 弹出层配置
  overlay = new Overlay({
    element: popupRef.value,
    autoPan: true,
    autoPanAnimation: { duration: 250 },
    positioning: 'bottom-center',
    offset: [0, -15],
    stopEvent: true,
  });

  map = new Map({
    target: mapRef.value,
    // 关键配置：自定义控件
    controls: [
      new Zoom({ className: 'custom-zoom-control' }), // 显式添加缩放，并自定义类名
      new GeolocationControl() // 添加自定义定位控件
    ],
    layers: [
      new TileLayer({
        source: new XYZ({
          url: 'https://webrd0{1-4}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
          crossOrigin: 'anonymous'
        })
      })
    ],
    overlays: [overlay],
    view: new View({
      center: fromLonLat([104.06, 30.67]),
      zoom: 12
    })
  });

  map.on('click', (e) => {
    const lonLat = toLonLat(e.coordinate);
    showPopup(e.coordinate, lonLat[0], lonLat[1]);
  });
};

// --- 显示弹窗逻辑 ---
const showPopup = async (coordinate, lon, lat) => {
  lonLatText.value = `经度：${lon.toFixed(6)}，纬度：${lat.toFixed(6)}`;
  overlay.setPosition(coordinate);
  popupShow.value = true;
  await getGaodeAddress(lon, lat);
};

// --- 高德逆地理编码 ---
const getGaodeAddress = async (lon, lat) => {
  try {
    addressInfo.value = '正在查询详细地址...';
    const url = `https://restapi.amap.com/v3/geocode/regeo?location=${lon},${lat}&key=${GAODE_WEB_KEY}&radius=100`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === '1' && data.regeocode) {
      addressInfo.value = data.regeocode.formatted_address;
    } else {
      addressInfo.value = '未能获取具体地址';
    }
  } catch (err) {
    addressInfo.value = '地址查询服务异常';
  }
};

// --- 搜索逻辑 ---
const debounce = (fn, delay) => {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};

const realOnSearch = async (value) => {
  if (!value.trim()) {
    options.value = [];
    return;
  }
  const url = `https://restapi.amap.com/v3/assistant/inputtips?key=${GAODE_WEB_KEY}&keywords=${encodeURIComponent(value)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === '1' && data.tips) {
      options.value = data.tips
        .filter(tip => tip.location && tip.location.length > 0)
        .map(tip => ({
          value: tip.name,
          label: `${tip.name} (${tip.district})`,
          location: tip.location,
        }));
    }
  } catch (e) {
    message.error('搜索服务暂不可用');
  }
};
const debounceOnSearch = debounce(realOnSearch, 500);

const onSelect = (value, option) => {
  if (option.location && map) {
    const [lon, lat] = option.location.split(',').map(Number);
    const coordinate = fromLonLat([lon, lat]);
    map.getView().animate({ center: coordinate, zoom: 16, duration: 500 });
    showPopup(coordinate, lon, lat);
  }
};

onMounted(() => {
  initMap();
});
</script>

<style scoped>
.map-wrapper {
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.map-container {
  width: 1150px;
  height: 495px;
  border: 1px solid #ddd;
  position: relative;
  background-color: #f5f5f5;
}

/* --- 1. 定制缩放按钮位置 (右下角) --- */
:deep(.custom-zoom-control) {
  top: auto !important;
  left: auto !important;
  bottom: 20px;
  right: 20px;
}

/* --- 2. 定制获取位置按钮位置 (左下角) --- */
:deep(.ol-get-location) {
  bottom: 20px;
  left: 20px;
}

/* 按钮通用样式美化 */
:deep(.ol-control button) {
  background-color: #ffffff !important;
  color: #333 !important;
  width: 32px !important;
  height: 32px !important;
  border: 1px solid #ccc !important;
  border-radius: 4px !important;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

:deep(.ol-control button:hover) {
  background-color: #f0f0f0 !important;
}

/* 弹窗样式 */
.ol-popup {
  position: absolute;
  background-color: white;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #ccc;
  min-width: 250px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.popup-arrow {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 10px solid white;
}

.popup-content {
  font-size: 13px;
  color: #333;
}
.popup-content p {
  margin-bottom: 8px;
}
</style>