import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, FlatList, Modal, Image, Platform } from 'react-native';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { getProducts, getSettings, saveBill } from '../store/storage';
import { useIsFocused } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';

export default function BillingScreen() {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [showCartDetails, setShowCartDetails] = useState(false);
  const [editingQtyProduct, setEditingQtyProduct] = useState(null);
  const [tempQty, setTempQty] = useState('');
  const [nextBillId, setNextBillId] = useState('HOTEL-001');

  const { t, language, toggleLanguage } = useLanguage();

  const openQtyModal = (productId, currentQty) => {
    setEditingQtyProduct(productId);
    setTempQty(String(currentQty));
  };

  const saveCustomQty = () => {
    const qty = parseInt(tempQty, 10);
    if (!isNaN(qty) && qty > 0) {
      setCart(cart.map(item => item.id === editingQtyProduct ? { ...item, qty: qty } : item));
    } else if (qty === 0) {
      setCart(cart.filter(item => item.id !== editingQtyProduct));
    }
    setEditingQtyProduct(null);
    setTempQty('');
  };


  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused]);

  const loadData = async () => {
    setProducts(await getProducts());
    setSettings(await getSettings());
    
    // Calculate next bill ID
    const { getBills } = require('../store/storage');
    const existingBills = await getBills();
    let nextNum = 1;
    if (existingBills && existingBills.length > 0) {
      const highestNum = existingBills.reduce((max, b) => {
        if (b.id && b.id.includes('-')) {
          const num = parseInt(b.id.split('-')[1], 10);
          if (!isNaN(num) && num > max) return num;
        }
        return max;
      }, 0);
      nextNum = highestNum + 1;
    }
    setNextBillId(`HOTEL-${String(nextNum).padStart(3, '0')}`);
  };

  // Extract unique categories from products
  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    const step = product.stepQty || 1;
    if (existingItem) {
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + step } : item));
    } else {
      setCart([...cart, { ...product, qty: step }]);
    }
  };

  const removeFromCart = (productId) => {
    const existingItem = cart.find(item => item.id === productId);
    const step = existingItem.stepQty || 1;
    if (existingItem.qty > step) {
      setCart(cart.map(item => item.id === productId ? { ...item, qty: item.qty - step } : item));
    } else {
      setCart(cart.filter(item => item.id !== productId));
    }
  };

  const totalItems = cart.reduce((sum, item) => sum + (item.unit === 'gram' ? 1 : item.qty), 0);
  const totalPrice = cart.reduce((sum, item) => {
    const itemTotal = item.unit === 'gram' ? (item.price / (item.stepQty || 50)) * item.qty : item.price * item.qty;
    return sum + itemTotal;
  }, 0);

  const getCartQty = (productId) => {
    const item = cart.find(item => item.id === productId);
    return item ? item.qty : 0;
  };

  // Filter products by search query AND selected category
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => a.name.localeCompare(b.name));

  const handlePrint = async () => {
    const bill = {
      id: nextBillId,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      timestamp: Date.now(),
      items: cart,
      total: totalPrice,
      paymentMethod
    };
    await saveBill(bill);

    // Print to terminal console
    // 58mm Thermal Printer typically supports 32 characters per line.
    console.log('\n\n\n'); // 1cm top space
    console.log('================================');
    console.log(`        ${settings?.shopName || 'GRAND HOTEL'}`);
    if (settings?.address) console.log(`        ${settings.address}`);
    if (settings?.phone) console.log(`        Ph: ${settings.phone}`);
    console.log('================================');
    console.log(`Bill No: ${bill.id}`);
    console.log(`Date: ${bill.date}  Time: ${bill.time}`);
    console.log('--------------------------------');
    console.log('Item            Qty   Rate   Total');
    console.log('--------------------------------');
    bill.items.forEach(item => {
      const name = t(item.name).padEnd(15).substring(0, 15);
      const qtyStr = item.unit === 'gram' ? `${item.qty}g` : String(item.qty);
      const qty = qtyStr.padEnd(5);
      const price = String(item.price).padEnd(6);
      const itemTotal = item.unit === 'gram' ? (item.price / (item.stepQty || 50)) * item.qty : item.price * item.qty;
      const total = String(itemTotal.toFixed(2));
      console.log(`${name} ${qty} ${price} ${total}`);
    });
    console.log('--------------------------------');
    console.log(`Total Items: ${bill.items.length}   Total Qty: ${totalItems}`);
    console.log('================================');
    console.log(`GRAND TOTAL:           Rs. ${bill.total.toFixed(2)}`);
    console.log('================================\n\n\n'); // 1cm bottom space

    setCart([]);
    setShowReceiptPreview(false);
    alert('Bill saved and receipt printed to console!');
    loadData(); // Refresh nextBillId
  };

  const renderProductCard = ({ item }) => {
    const qty = getCartQty(item.id);

    return (
      <View style={styles.productCard}>
        <View style={styles.imageContainer}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.productImage} resizeMode="cover" />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <MaterialIcons name="local-cafe" size={40} color={Colors.primary} />
            </View>
          )}
          <View style={styles.priceTag}>
            <Text style={styles.priceTagText}>₹{item.price}{item.unit === 'gram' ? `/${item.stepQty || 50}g` : ''}</Text>
          </View>
        </View>

        <View style={styles.productInfoContainer}>
          <Text style={styles.productName} numberOfLines={1}>{t(item.name)}</Text>
          <Text style={styles.productCategory} numberOfLines={1}>{t(item.category)}</Text>

          {qty === 0 ? (
            <TouchableOpacity style={styles.addButton} onPress={() => addToCart(item)}>
              <Text style={styles.addButtonText}>+ {t('add')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.stepperContainer}>
              <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.stepperBtn}><Text style={styles.stepperBtnText}>-</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => openQtyModal(item.id, qty)}>
                <Text style={styles.stepperValue}>{qty}{item.unit === 'gram' ? 'g' : ''}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => addToCart(item)} style={styles.stepperBtn}><Text style={styles.stepperBtnText}>+</Text></TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <FontAwesome5 name="coffee" size={20} color="#fff" style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.shopName}>{settings?.shopName || 'GRAND HOTEL'}</Text>
            <Text style={styles.dateText}>{new Date().toDateString()}</Text>
          </View>
          
          <TouchableOpacity onPress={toggleLanguage} style={styles.langToggle}>
            <Text style={styles.langToggleText}>{language === 'ta' ? 'English' : 'தமிழ்'}</Text>
          </TouchableOpacity>

          <View style={styles.printerBadge}>
            <FontAwesome5 name="print" size={12} color="#fff" style={{ marginRight: 5 }} />
            <Text style={{ color: '#fff', fontSize: 12 }}>{t('notConnected')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <FontAwesome5 name="search" size={16} color={Colors.textLight} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filtersWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContainer}>
          {categories.map(category => (
            <TouchableOpacity
              key={category}
              style={[styles.filterChip, selectedCategory === category && styles.filterChipActive]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={selectedCategory === category ? styles.filterChipTextActive : styles.filterChipText}>
                {category === 'All' ? t('all') : t(category)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={item => item.id}
        renderItem={renderProductCard}
        numColumns={2}
        contentContainerStyle={styles.gridContainer}
      />

      {totalItems > 0 && (
        <View style={styles.bottomSheet}>
          {showCartDetails && (
            <View style={styles.cartDetailsContainer}>
              <View style={styles.cartDetailsHeader}>
                <Text style={styles.cartDetailsTitle}>{t('currentBillItems')} ({cart.length})</Text>
                <TouchableOpacity onPress={() => setCart([])} style={styles.clearAllBtn}>
                  <FontAwesome5 name="trash" size={12} color={Colors.dangerText} style={{ marginRight: 5 }} />
                  <Text style={styles.clearAllText}>{t('clearAll')}</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.cartItemsList} showsVerticalScrollIndicator={false}>
                {cart.map((item, index) => (
                  <View key={item.id} style={[styles.cartItemRow, index % 2 === 1 ? { backgroundColor: '#E8F5E9', borderColor: '#C8E6C9' } : { backgroundColor: '#FFFFFF', borderColor: '#F0F0F0' }]}>
                    <View style={{ flex: 1, paddingRight: 10, justifyContent: 'center' }}>
                      <Text style={styles.cartItemName} numberOfLines={2}>{t(item.name)}</Text>
                      <Text style={styles.cartItemPriceCalc}>₹{item.price}{item.unit === 'gram' ? `/${item.stepQty || 50}g` : ''} x {item.unit === 'gram' ? item.qty / (item.stepQty || 50) : item.qty}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.cartItemBtn}>
                          <Text style={styles.cartItemBtnText}>-</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => openQtyModal(item.id, item.qty)}>
                          <Text style={styles.cartItemQty}>{item.qty}{item.unit === 'gram' ? 'g' : ''}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => addToCart(item)} style={[styles.cartItemBtn, { backgroundColor: Colors.primary }]}>
                          <Text style={[styles.cartItemBtnText, { color: '#fff' }]}>+</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.cartItemTotal}>₹{(item.unit === 'gram' ? (item.price / (item.stepQty || 50)) * item.qty : item.price * item.qty).toFixed(0)}</Text>
                      <TouchableOpacity onPress={() => setCart(cart.filter(i => i.id !== item.id))} style={styles.cartItemDelete}>
                        <FontAwesome5 name="trash-alt" size={16} color={Colors.dangerText} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>{t('payment')}</Text>
            <View style={styles.paymentOptions}>
              {['Cash', 'UPI', 'Card'].map(method => (
                <TouchableOpacity key={method} style={[styles.paymentBtn, paymentMethod === method && styles.paymentBtnActive]} onPress={() => setPaymentMethod(method)}>
                  <Text style={[styles.paymentBtnText, paymentMethod === method && styles.paymentBtnTextActive]}>{method === 'Cash' ? t('cash') : method === 'UPI' ? t('upi') : t('card')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.cartRow}>
            <TouchableOpacity onPress={() => setShowCartDetails(!showCartDetails)} style={{ paddingVertical: 5 }}>
              <Text style={[styles.cartItemsText, { color: Colors.primary, fontWeight: 'bold' }]}>
                <FontAwesome5 name="shopping-cart" color={Colors.primary} size={14} /> {totalItems} {t('items')} <FontAwesome5 name={showCartDetails ? "caret-up" : "caret-down"} color={Colors.primary} size={14} />
              </Text>
              <Text style={styles.cartTotal}>₹{totalPrice.toFixed(2)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.printBillBtn} onPress={() => setShowReceiptPreview(true)}>
              <FontAwesome5 name="print" size={16} color="#fff" style={{ marginRight: 10 }} />
              <Text style={styles.printBillText}>{t('printBill')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Custom Quantity Modal */}
      <Modal visible={editingQtyProduct !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 20, width: '100%', maxWidth: 340, alignItems: 'center' }]}>
            <Text style={styles.modalTitle}>{t('enterQuantity')}</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: Colors.border, width: '100%', padding: 10, borderRadius: 8, marginVertical: 15, fontSize: 18, textAlign: 'center' }}
              keyboardType="numeric"
              value={tempQty}
              onChangeText={setTempQty}
              autoFocus
              selectTextOnFocus
            />
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingQtyProduct(null)}>
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmPrintBtn, { flex: 1 }]} onPress={saveCustomQty}>
                <Text style={styles.confirmPrintText}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Thermal Receipt Preview Modal */}
      <Modal visible={showReceiptPreview} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <FontAwesome5 name="receipt" size={18} color={Colors.primary} style={{ marginRight: 10 }} />
                <Text style={styles.modalTitle}>{t('thermalReceiptPreview')}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowReceiptPreview(false)}>
                <FontAwesome5 name="times" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.warningBanner}>
              <Text style={styles.warningText}>{t('noPrinterConnected')}</Text>
            </View>

            <ScrollView style={styles.receiptPaper} showsVerticalScrollIndicator={false}>
              <View style={{ height: 35 }} />
              
              <View style={styles.receiptHeader}>
                <Text style={styles.receiptShopName}>{settings?.shopName || 'GRAND HOTEL'}</Text>
                {settings?.address ? <Text style={styles.receiptCenterText}>{settings.address}</Text> : null}
                {settings?.phone ? <Text style={styles.receiptCenterText}>Ph: {settings.phone}</Text> : null}
              </View>

              <View style={styles.receiptDivider} />

              <View style={styles.receiptRow}>
                <Text style={styles.receiptText}>{t('billNo')}:</Text>
                <Text style={styles.receiptTextBold}>{nextBillId}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptText}>{t('date')}: {new Date().toLocaleDateString()}</Text>
                <Text style={styles.receiptText}>{t('time')}: {new Date().toLocaleTimeString()}</Text>
              </View>

              <View style={styles.receiptDivider} />

              <View style={styles.receiptRow}>
                <Text style={[styles.receiptTextBold, { flex: 2 }]}>{t('item')}</Text>
                <Text style={[styles.receiptTextBold, { flex: 1, textAlign: 'center' }]}>{t('qty')}</Text>
                <Text style={[styles.receiptTextBold, { flex: 1, textAlign: 'right' }]}>{t('rate')}</Text>
                <Text style={[styles.receiptTextBold, { flex: 1, textAlign: 'right' }]}>{t('total')}</Text>
              </View>

              <View style={styles.receiptDivider} />

              {cart.map(item => (
                <View key={item.id} style={[styles.receiptRow, { marginBottom: 6 }]}>
                  <Text style={[styles.receiptText, { flex: 2 }]} numberOfLines={1}>{t(item.name)}</Text>
                  <Text style={[styles.receiptText, { flex: 1, textAlign: 'center' }]}>{item.unit === 'gram' ? `${item.qty}g` : item.qty}</Text>
                  <Text style={[styles.receiptText, { flex: 1, textAlign: 'right' }]}>{item.price}</Text>
                  <Text style={[styles.receiptText, { flex: 1, textAlign: 'right' }]}>{(item.unit === 'gram' ? (item.price / (item.stepQty || 50)) * item.qty : item.price * item.qty).toFixed(2)}</Text>
                </View>
              ))}

              <View style={styles.receiptDivider} />

              <View style={styles.receiptRow}>
                <Text style={styles.receiptText}>{t('items')}: {cart.length}</Text>
                <Text style={styles.receiptText}>{t('qty')}: {totalItems}</Text>
              </View>

              <View style={styles.receiptDivider} />

              <View style={styles.receiptRow}>
                <Text style={styles.receiptTotalLabel}>{t('grandTotal')}:</Text>
                <Text style={styles.receiptTotalValue}>₹ {totalPrice.toFixed(2)}</Text>
              </View>
              <View style={styles.receiptDivider} />
              <Text style={[styles.receiptCenterText, { marginTop: 5, fontSize: 12 }]}>{t('thankYou')}</Text>

              <View style={{ height: 35 }} />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowReceiptPreview(false)}>
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmPrintBtn} onPress={handlePrint}>
                <FontAwesome5 name="print" size={16} color="#fff" style={{ marginRight: 10 }} />
                <Text style={styles.confirmPrintText}>{t('printReceipt')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, padding: 15, paddingTop: 40 },
  headerTop: { flexDirection: 'row', alignItems: 'center' },
  shopName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  dateText: { color: '#fff', fontSize: 12, opacity: 0.8 },
  langToggle: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, marginRight: 10 },
  langToggleText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  printerBadge: { backgroundColor: 'rgba(0,0,0,0.2)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 15, paddingHorizontal: 15, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, height: 50 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16 },
  filtersWrapper: { paddingLeft: 15, marginBottom: 15 },
  filtersContainer: { paddingRight: 15, alignItems: 'center' },
  filterChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, marginRight: 10, backgroundColor: '#fff' },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { color: Colors.text, fontSize: 14 },
  filterChipTextActive: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  gridContainer: { paddingHorizontal: 10, paddingBottom: 150 },
  productCard: { 
    flex: 1, 
    backgroundColor: '#fff', 
    margin: 6, 
    borderRadius: 16, 
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  imageContainer: {
    width: '100%',
    height: 110,
    backgroundColor: '#f5f5f5',
    position: 'relative'
  },
  productImage: { 
    width: '100%', 
    height: '100%', 
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceTag: { 
    position: 'absolute', 
    top: 8, 
    right: 8, 
    backgroundColor: Colors.primary, 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 8, 
    zIndex: 1 
  },
  priceTagText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  productInfoContainer: {
    padding: 10,
  },
  productName: { fontSize: 20, fontWeight: 'bold', color: Colors.text, marginBottom: 2 },
  productCategory: { fontSize: 12, color: Colors.textLight, marginBottom: 12 },
  addButton: { backgroundColor: Colors.primary, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 },
  stepperBtn: { paddingHorizontal: 10 },
  stepperBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  stepperValue: { color: '#fff', fontWeight: 'bold', fontSize: 20 },
  bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.primaryLight, padding: 15, borderTopLeftRadius: 20, borderTopRightRadius: 20, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 5 },
  paymentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 16, elevation: 4, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, borderWidth: 1, borderColor: '#FFE0CC' },
  paymentLabel: { fontSize: 14, fontWeight: 'bold', color: Colors.text, marginRight: 15 },
  paymentOptions: { flexDirection: 'row', flex: 1, gap: 10 },
  paymentBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.border },
  paymentBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  paymentBtnText: { fontSize: 14, color: Colors.textLight },
  paymentBtnTextActive: { color: '#fff', fontWeight: 'bold' },
  cartDetailsContainer: { marginBottom: 15, maxHeight: 400, backgroundColor: '#FFFFFF', padding: 15, borderRadius: 16, elevation: 8, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, borderWidth: 1, borderColor: '#FFE0CC' },
  cartDetailsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cartDetailsTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  clearAllBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF0F0', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  clearAllText: { color: Colors.dangerText, fontWeight: 'bold', fontSize: 13 },
  cartItemsList: {},
  cartItemRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1 },
  cartItemInfo: { flex: 1, paddingRight: 10 },
  cartItemName: { fontSize: 14, color: Colors.text, marginBottom: 4 },
  cartItemPriceCalc: { fontSize: 12, color: Colors.textLight },
  cartItemActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cartItemBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  cartItemBtnText: { color: Colors.primary, fontSize: 14, fontWeight: 'bold' },
  cartItemQty: { fontSize: 20, fontWeight: 'bold', color: Colors.text, minWidth: 20, textAlign: 'center' },
  cartItemTotal: { fontSize: 14, fontWeight: 'bold', color: Colors.primary, minWidth: 35, textAlign: 'right' },
  cartItemDelete: { padding: 4 },
  cartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cartItemsText: { fontSize: 14, color: Colors.text },
  cartTotal: { fontSize: 28, fontWeight: 'bold', color: Colors.primary },
  printBillBtn: { backgroundColor: Colors.primary, flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 15, borderRadius: 8, alignItems: 'center' },
  printBillText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', width: '100%', maxWidth: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  warningBanner: { backgroundColor: Colors.primaryLight, padding: 10 },
  warningText: { color: Colors.primary, fontSize: 12, textAlign: 'center' },
  receiptPaper: {
    backgroundColor: '#fff',
    padding: 10,
    marginVertical: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 2,
    elevation: 2,
    maxHeight: 350,
    width: 250, // 2-inch 58mm simulation width
    alignSelf: 'center',
  },
  receiptHeader: { marginBottom: 10 },
  receiptShopName: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 5, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  receiptCenterText: { textAlign: 'center', fontSize: 10, color: Colors.text, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  receiptDivider: { borderBottomWidth: 1, borderBottomColor: '#ddd', borderStyle: 'dashed', marginVertical: 8 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptText: { fontSize: 10, color: Colors.text, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  receiptTextBold: { fontSize: 10, fontWeight: 'bold', color: Colors.text, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  receiptTotalLabel: { fontSize: 12, fontWeight: 'bold', flex: 1, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  receiptTotalValue: { fontSize: 12, fontWeight: 'bold', textAlign: 'right', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  modalActions: { flexDirection: 'row', padding: 15, borderTopWidth: 1, borderTopColor: Colors.border, gap: 10 },
  cancelBtn: { flex: 1, padding: 15, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelBtnText: { color: Colors.primary, fontWeight: 'bold' },
  confirmPrintBtn: { flex: 2, backgroundColor: Colors.primary, flexDirection: 'row', padding: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  confirmPrintText: { color: '#fff', fontWeight: 'bold' }
});
