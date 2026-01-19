<template>
  <a-auto-complete
    v-model:value="searchValue"
    :options="options"
    :style="{ width: '400px', marginBottom: '16px' }"
    placeholder="请输入地址关键词"
    @select="onSelect"
    @search="debounceOnSearch"
    allowClear
  />
  <div ref="mapRef" class="map-container"></div>
  <!-- ✅ 修复：弹窗增加尖角箭头，样式重构，实现下部中间尖角对准点击坐标 -->
  <div
    ref="popupRef"
    class="ol-popup"
    :style="{ top: `${popupPosition[1]}px`, left: `${popupPosition[0]}px` }"
    v-show="popupShow"
  >
    <!-- 弹窗尖角箭头 -->
    <div class="popup-arrow"></div>
    <div class="popup-content">
      <p>📍 点击经纬度：{{ lonLatText }}</p>
      <p>🏠 详细地址：{{ addressInfo }}</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, nextTick } from 'vue';
import { message } from 'ant-design-vue';
import 'ant-design-vue/dist/antd.css';
// 地址搜索相关
const searchValue = ref('');
const options = ref([]);
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { fromLonLat, toLonLat } from 'ol/proj';


let map= null
// 地图容器ref
const mapRef = ref(null);
// 弹窗相关ref和响应式数据
const popupShow = ref(false);
const popupPosition = ref([0, 0]);
const lonLatText = ref('');
const addressInfo = ref('地址查询中...');

// 高德地图 Web 服务 KEY 
const GAODE_WEB_KEY = '77e981c13f41f780fb6fd888dc73a5ec';

// 防抖函数
const debounce = (fn, delay = 500) => {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
};


// 初始化地图核心方法
const initMap = () => {
   map = new Map({
    target: mapRef.value,
    layers: [
      new TileLayer({
        source: new XYZ({
          url: 'https://webrd0{1-4}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
          crossOrigin: 'anonymous',
          cacheSize: 1024
        })
      })
    ],
    view: new View({
      center: fromLonLat([104.06, 30.67]),
      zoom: 10,
      minZoom: 2,
      maxZoom: 18
    })
  });

  // ✅ 修复2：地图点击弹窗位置精准计算，解决偏移问题
  map.on('click', (e) => {
    const lonLat = toLonLat(e.coordinate);
    const [lon, lat] = lonLat;
    lonLatText.value = `经度：${lon.toFixed(6)}，纬度：${lat.toFixed(6)}`;
    // 核心修复：弹窗坐标做偏移修正，为尖角预留位置
    setPopupPosition(e.pixel[0], e.pixel[1]);
    popupShow.value = true;
    getGaodeAddress(lon, lat);
  });
};

// ✅ 新增：弹窗坐标精准定位公共方法 (核心修复偏移问题)
const setPopupPosition = (x, y) => {
  // 弹窗默认宽度 280px，计算向左偏移值，让【尖角居中】对准点击坐标
  const offsetX = -140 + 8; 
  const offsetY = -10;
  popupPosition.value = [x + offsetX, y + offsetY];
};

// 地址搜索逻辑
const realOnSearch = async (value) => {
  searchValue.value = value;
  if (!value.trim()) {
    options.value = [];
    return;
  }
  const url = `https://restapi.amap.com/v3/assistant/inputtips?key=${GAODE_WEB_KEY}&keywords=${encodeURIComponent(value)}&city=全国&datatype=all`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === '1' && data.tips) {
      options.value = data.tips
        .filter(tip => tip.location)
        .map(tip => ({
          value: tip.name + (tip.district ? `（${tip.district}）` : ''),
          label: tip.name + (tip.district ? `（${tip.district}）` : ''),
          location: tip.location,
        }));
    } else {
      options.value = [];
    }
  } catch (e) {
    options.value = [];
    message.error('地址联想失败，请稍后重试');
  }
};
const debounceOnSearch = debounce(realOnSearch, 500);

// ✅ 修复1：选中下拉地址后弹窗不显示的核心问题 (全部修复)
const onSelect = async (value, option) => {
  searchValue.value = value;
  if (option.location && map) {
    const [lon, lat] = option.location.split(',').map(Number);
    // 1. 地图平滑定位到选中地址
    map.getView().animate({
      center: fromLonLat([lon, lat]),
      zoom: 16,
      duration: 500
    });
    // 2. 必加：等待地图渲染完成后，再计算弹窗像素坐标，解决异步渲染拿不到坐标的问题
    // await map?.once('moveend');
    await nextTick();
    // 3. 获取选中地址的像素坐标
    const coordinate = fromLonLat([lon, lat]);
    const pixel = map.getPixelFromCoordinate(coordinate);
    // 4. 设置弹窗位置 + 显示弹窗
    setPopupPosition(pixel[0], pixel[1]);
    popupShow.value = true;
    // 5. 赋值经纬度 + 查询详细地址
    lonLatText.value = `经度：${lon.toFixed(6)}，纬度：${lat.toFixed(6)}`;
    await getGaodeAddress(lon, lat);
  }
};

// 高德逆地理编码
const getGaodeAddress = async (lon, lat) => {
  try {
    addressInfo.value = '地址查询中...';
    const url = `https://restapi.amap.com/v3/geocode/regeo?output=json&location=${lon},${lat}&key=${GAODE_WEB_KEY}&radius=10&extensions=base`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === '1' && data.regeocode) {
      const { formatted_address, addressComponent } = data.regeocode;
      addressInfo.value = `${formatted_address} ${addressComponent.township}${addressComponent.neighborhood.name}${addressComponent.building.name}`;
    } else {
      addressInfo.value = '暂无匹配地址信息';
    }
  } catch (err) {
    addressInfo.value = '地址查询失败，请重试';
    console.error('高德地址查询错误：', err);
  }
};

onMounted(() => {
  initMap();
});
</script>

<style scoped>
/* ant-design-vue 下拉框样式穿透 */
:deep(.ant-select-dropdown) {
  z-index: 10001 !important;
}
/* 地图容器样式 */
.map-container {
  width: 1000px;
  height: 800px;
	border: 1px solid #ccc;
  position: relative;
  overflow: hidden;
}

/* ✅ 核心重构：弹窗样式 + 下部中间尖角箭头  */
.ol-popup {
  position: absolute;
  background-color: #fff;
  padding: 10px 15px;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  border: 1px solid #e8e8e8;
  z-index: 9999;
  min-width: 280px;
  box-sizing: border-box;
  /* 核心：让尖角的绝对定位基于弹窗本身 */
  position: absolute;
}
/* 弹窗下部中间的尖角箭头 - 核心样式 */
.popup-arrow {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid #ffffff;
  z-index: 1;
}
/* 尖角阴影，贴合弹窗阴影，更美观 */
.popup-arrow::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid #e8e8e8;
  z-index: -1;
}
.popup-content {
  font-size: 14px;
  line-height: 1.6;
  color: #333;
}
.popup-content p {
  margin: 0;
  padding: 2px 0;
}
</style>