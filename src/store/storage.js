import AsyncStorage from '@react-native-async-storage/async-storage';

const PRODUCTS_KEY = '@products_hotel';
const BILLS_KEY = '@bills_hotel';
const SETTINGS_KEY = '@settings_hotel';

export const getProducts = async () => {
  try {
    const data = await AsyncStorage.getItem(PRODUCTS_KEY);
    let products = data ? JSON.parse(data) : [
      { id: '1', name: 'Idli (2 pcs)', category: 'Breakfast', price: 25 },
      { id: '2', name: 'Masala Dosa', category: 'Breakfast', price: 60 },
      { id: '3', name: 'Pongal', category: 'Breakfast', price: 50 },
      { id: '4', name: 'Chicken Biryani', category: 'Lunch', price: 150 },
      { id: '5', name: 'Mutton Biryani', category: 'Lunch', price: 220 },
      { id: '6', name: 'Full Meals', category: 'Lunch', price: 100 },
      { id: '7', name: 'Parotta (2 pcs)', category: 'Dinner', price: 40 },
    ];
    
    // Auto-seed 10 more items
    const hasSeeded = await AsyncStorage.getItem('@seeded_10_extra');
    if (!hasSeeded) {
      const tenMore = [
         { id: '101', name: 'Chicken 65', category: 'Starters', price: 120 },
         { id: '102', name: 'Chilli Chicken', category: 'Starters', price: 130 },
         { id: '103', name: 'Chapati (2 pcs)', category: 'Dinner', price: 30 },
         { id: '104', name: 'Egg Fried Rice', category: 'Dinner', price: 100 },
         { id: '105', name: 'Chicken Fried Rice', category: 'Dinner', price: 120 },
         { id: '106', name: 'Mutton Chukka', category: 'Side Dish', price: 160 },
         { id: '107', name: 'Chicken Gravy', category: 'Side Dish', price: 140 },
         { id: '108', name: 'Lemon Juice', category: 'Beverages', price: 40 },
         { id: '109', name: 'Rose Milk', category: 'Beverages', price: 35 },
         { id: '110', name: 'Filter Coffee', category: 'Beverages', price: 30 }
      ];
      products = [...products, ...tenMore];
      await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
      await AsyncStorage.setItem('@seeded_10_extra', 'true');
    }

    // Auto-seed Pakoda
    const hasSeededPakoda = await AsyncStorage.getItem('@seeded_pakoda');
    if (!hasSeededPakoda) {
      const pakodaItem = [
         { id: '111', name: 'Chicken Pakoda', category: 'Starters', price: 50, unit: 'gram', stepQty: 100 }
      ];
      products = [...products, ...pakodaItem];
      await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
      await AsyncStorage.setItem('@seeded_pakoda', 'true');
    }

    // Auto-seed gram products
    const hasSeededGrams = await AsyncStorage.getItem('@seeded_grams_2');
    if (!hasSeededGrams) {
      const gramItems = [
         { id: '112', name: 'Mutton Keema', category: 'Side Dish', price: 80, unit: 'gram', stepQty: 100 },
         { id: '113', name: 'Prawn Fry', category: 'Starters', price: 100, unit: 'gram', stepQty: 100 }
      ];
      products = [...products, ...gramItems];
      await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
      await AsyncStorage.setItem('@seeded_grams_2', 'true');
    }

    // Auto-seed 10 MORE hotel products
    const hasSeeded10MoreHotel = await AsyncStorage.getItem('@seeded_10_more_hotel');
    if (!hasSeeded10MoreHotel) {
      const tenMoreHotel = [
         { id: '114', name: 'Paneer Butter Masala', category: 'Side Dish', price: 150 },
         { id: '115', name: 'Kadai Paneer', category: 'Side Dish', price: 160 },
         { id: '116', name: 'Dal Makhani', category: 'Side Dish', price: 120 },
         { id: '117', name: 'Tandoori Roti', category: 'Dinner', price: 20 },
         { id: '118', name: 'Garlic Naan', category: 'Dinner', price: 45 },
         { id: '119', name: 'Chicken Lollipop', category: 'Starters', price: 180 },
         { id: '120', name: 'Mutton Rogan Josh', category: 'Side Dish', price: 250 },
         { id: '121', name: 'Fish Curry', category: 'Side Dish', price: 200 },
         { id: '122', name: 'Tandoori Chicken (Half)', category: 'Starters', price: 220 },
         { id: '123', name: 'Gobi Manchurian', category: 'Starters', price: 110 }
      ];
      products = [...products, ...tenMoreHotel];
      await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
      await AsyncStorage.setItem('@seeded_10_more_hotel', 'true');
    }

    return products;
  } catch (e) {
    return [];
  }
};

export const saveProducts = async (products) => {
  await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
};

export const getBills = async () => {
  try {
    const data = await AsyncStorage.getItem(BILLS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveBill = async (bill) => {
  const bills = await getBills();
  bills.unshift(bill);
  await AsyncStorage.setItem(BILLS_KEY, JSON.stringify(bills));
};

export const clearBills = async () => {
  await AsyncStorage.setItem(BILLS_KEY, JSON.stringify([]));
};

export const updateBills = async (newBills) => {
  await AsyncStorage.setItem(BILLS_KEY, JSON.stringify(newBills));
};

export const getSettings = async () => {
  try {
    const data = await AsyncStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : {
      shopName: 'GRAND HOTEL',
      tagline: 'Authentic South Indian & Chinese',
      address: 'Main Road, City Center',
      phone: '+91 98765 43210'
    };
  } catch (e) {
    return null;
  }
};

export const saveSettings = async (settings) => {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};
