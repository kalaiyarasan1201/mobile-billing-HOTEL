import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, SafeAreaView, Modal, Alert, Image, ScrollView } from 'react-native';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { getProducts, saveProducts } from '../store/storage';
import { useIsFocused } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { useLanguage } from '../context/LanguageContext';

export default function ProductsScreen() {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({ name: '', category: '', price: '', stepQty: '', unit: 'item', image: null });
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  const { t } = useLanguage();
  
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      loadProducts();
    }
  }, [isFocused]);

  const loadProducts = async () => {
    const data = await getProducts();
    setProducts(data);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setFormData({ ...formData, image: result.assets[0].uri });
    }
  };

  const handleSaveProduct = async () => {
    if (!formData.name || !formData.category || !formData.price) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    const stepQty = parseInt(formData.stepQty) || 1;

    let updatedProducts;
    if (editingProduct) {
      // Edit existing
      updatedProducts = products.map(p => 
        p.id === editingProduct.id 
          ? { ...p, name: formData.name, category: formData.category, price: parseFloat(formData.price), stepQty, unit: formData.unit, image: formData.image }
          : p
      );
    } else {
      // Add new
      const newProduct = {
        id: Date.now().toString(),
        name: formData.name,
        category: formData.category,
        price: parseFloat(formData.price),
        stepQty,
        unit: formData.unit,
        image: formData.image
      };
      updatedProducts = [...products, newProduct];
    }

    setProducts(updatedProducts);
    await saveProducts(updatedProducts);
    closeModal();
  };

  const handleDeleteProduct = (id) => {
    if (Platform.OS === 'web') {
      const confirmDelete = window.confirm("Are you sure you want to delete this product?");
      if (confirmDelete) {
        deleteProductConfirmed(id);
      }
    } else {
      Alert.alert('Delete Product', 'Are you sure you want to delete this product?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteProductConfirmed(id) }
      ]);
    }
  };

  const deleteProductConfirmed = async (id) => {
    const updatedProducts = products.filter(p => p.id !== id);
    setProducts(updatedProducts);
    await saveProducts(updatedProducts);
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({ name: '', category: '', price: '', stepQty: '1', unit: 'item', image: null });
    setIsModalVisible(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({ name: product.name, category: product.category, price: product.price.toString(), stepQty: product.stepQty ? product.stepQty.toString() : '1', unit: product.unit || 'item', image: product.image });
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setShowCategoryDropdown(false);
    setEditingProduct(null);
    setFormData({ name: '', category: '', price: '', stepQty: '', unit: 'item', image: null });
  };

  const existingCategories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const filteredProducts = products
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const renderProductItem = ({ item }) => (
    <View style={styles.productCard}>
      <View style={styles.iconContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={{ width: 40, height: 40, borderRadius: 8 }} />
        ) : (
          <MaterialIcons name="local-cafe" size={24} color={Colors.primary} />
        )}
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{t(item.name)}</Text>
        <Text style={styles.productCategory}>{t(item.category)} • ₹{item.price} {item.unit === 'gram' ? `/ ${item.stepQty || 50}g` : ''}</Text>
      </View>
      <TouchableOpacity style={styles.actionButton} onPress={() => openEditModal(item)}>
        <FontAwesome5 name="pencil-alt" size={16} color={Colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionButton} onPress={() => handleDeleteProduct(item.id)}>
        <FontAwesome5 name="trash" size={16} color={Colors.dangerText} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('productCatalog')} ({products.length})</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <FontAwesome5 name="search" size={16} color={Colors.textLight} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('filterProducts')}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={item => item.id}
        renderItem={renderProductItem}
        contentContainerStyle={styles.listContainer}
      />

      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <FontAwesome5 name="plus" size={20} color="#fff" />
      </TouchableOpacity>

      {/* Add/Edit Product Modal designed exactly like the screenshot */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <Text style={styles.modalTitle}>{editingProduct ? t('editProduct') : t('addProduct')}</Text>
            
            {/* Image Picker Area */}
            <TouchableOpacity style={styles.imagePickerArea} onPress={pickImage}>
              {formData.image ? (
                <Image source={{ uri: formData.image }} style={styles.pickedImage} />
              ) : (
                <>
                  <FontAwesome5 name="image" size={30} color={Colors.primary} />
                  <FontAwesome5 name="plus" size={12} color={Colors.primary} style={{ position: 'absolute', top: 25, right: '45%' }} />
                  <Text style={styles.imagePickerText}>{t('tapToPickPhoto')}</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Input Group with Legend-style label */}
            <View style={styles.inputGroup}>
              <View style={styles.legendWrapper}>
                <Text style={styles.legendText}>{t('productName')}</Text>
              </View>
              <TextInput 
                style={styles.input} 
                value={formData.name} 
                onChangeText={t => setFormData({...formData, name: t})} 
                placeholder="" 
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.legendWrapper}>
                <Text style={styles.legendText}>{t('unitType')}</Text>
              </View>
              <View style={{flexDirection: 'row', marginTop: 10, borderWidth: 1, borderColor: '#FFDDC2', borderRadius: 8, overflow: 'hidden'}}>
                <TouchableOpacity 
                  style={{flex: 1, padding: 12, backgroundColor: formData.unit === 'item' ? Colors.primary : 'transparent', alignItems: 'center'}}
                  onPress={() => setFormData({...formData, unit: 'item', stepQty: '1'})}>
                  <Text style={{color: formData.unit === 'item' ? '#fff' : Colors.text, fontWeight: 'bold'}}>{t('itemPiece')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{flex: 1, padding: 12, backgroundColor: formData.unit === 'gram' ? Colors.primary : 'transparent', alignItems: 'center'}}
                  onPress={() => setFormData({...formData, unit: 'gram', stepQty: '50'})}>
                  <Text style={{color: formData.unit === 'gram' ? '#fff' : Colors.text, fontWeight: 'bold'}}>{t('weightGram')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.legendWrapper}>
                <Text style={styles.legendText}>{formData.unit === 'gram' ? t('quantityStepGram') : t('quantityStepItem')}</Text>
              </View>
              <TextInput 
                style={styles.input} 
                value={formData.stepQty} 
                onChangeText={t => setFormData({...formData, stepQty: t})} 
                keyboardType="numeric" 
                placeholder="Default is 1" 
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.legendWrapper}>
                <Text style={styles.legendText}>{formData.unit === 'gram' ? `${t('priceFor')} ${formData.stepQty || 50}g (₹)` : t('price')}</Text>
              </View>
              <TextInput 
                style={styles.input} 
                value={formData.price} 
                onChangeText={t => setFormData({...formData, price: t})} 
                keyboardType="numeric" 
                placeholder="" 
              />
            </View>

            <View style={[styles.inputGroup, { zIndex: 1000 }]}>
              <View style={styles.legendWrapper}>
                <Text style={styles.legendText}>{t('category')}</Text>
              </View>
              <View style={styles.categoryInputWrapper}>
                <TextInput 
                  style={styles.categoryInput} 
                  value={formData.category} 
                  onChangeText={t => setFormData({...formData, category: t})} 
                  placeholder={t('enterCategory')} 
                  onFocus={() => setShowCategoryDropdown(true)}
                />
                <TouchableOpacity onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}>
                  <MaterialIcons name="arrow-drop-down" size={24} color={Colors.text} style={{marginRight: 10}} />
                </TouchableOpacity>
              </View>
              {showCategoryDropdown && existingCategories.length > 0 && (
                <View style={styles.dropdownContainer}>
                  <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled" style={{ maxHeight: 150 }}>
                    {existingCategories
                      .filter(cat => cat.toLowerCase().includes(formData.category.toLowerCase()))
                      .map((cat, idx) => (
                      <TouchableOpacity 
                        key={idx} 
                        style={styles.dropdownItem}
                        onPress={() => {
                          setFormData({...formData, category: cat});
                          setShowCategoryDropdown(false);
                        }}
                      >
                        <Text style={{ color: Colors.text }}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProduct}>
                <Text style={styles.saveBtnText}>{t('save')}</Text>
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
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 50
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16 },
  listContainer: { paddingHorizontal: 15, paddingBottom: 80 },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconContainer: {
    backgroundColor: Colors.primaryLight,
    padding: 10,
    borderRadius: 10,
    marginRight: 15,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center'
  },
  productInfo: { flex: 1 },
  productName: { fontSize: 20, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  productCategory: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  actionButton: { padding: 10, marginLeft: 5 },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: Colors.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#F8F4FA', borderRadius: 24, padding: 25, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.text, marginBottom: 25 },
  
  imagePickerArea: {
    backgroundColor: '#FFF0E6',
    borderRadius: 12,
    padding: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    position: 'relative'
  },
  imagePickerText: { color: Colors.primary, fontSize: 12, fontWeight: 'bold', marginTop: 10 },
  pickedImage: { width: '100%', height: 100, borderRadius: 8, resizeMode: 'cover' },
  
  inputGroup: { marginBottom: 20, position: 'relative' },
  legendWrapper: {
    position: 'absolute',
    top: -10,
    left: 10,
    backgroundColor: '#F8F4FA',
    paddingHorizontal: 5,
    zIndex: 1,
  },
  legendText: { fontSize: 12, color: Colors.textLight },
  input: { 
    borderWidth: 1, 
    borderColor: '#FFDDC2', 
    borderRadius: 8, 
    padding: 15, 
    fontSize: 16, 
    color: Colors.text,
    backgroundColor: 'transparent'
  },
  categoryInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1, 
    borderColor: '#FFDDC2', 
    borderRadius: 8,
  },
  categoryInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: Colors.text
  },
  dropdownContainer: {
    backgroundColor: '#fff', 
    borderWidth: 1, 
    borderColor: '#FFDDC2', 
    borderTopWidth: 0, 
    borderBottomLeftRadius: 8, 
    borderBottomRightRadius: 8, 
    overflow: 'hidden',
    marginTop: -1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  dropdownItem: {
    padding: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f1f2f6'
  },
  
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 10 },
  cancelBtn: { padding: 12, marginRight: 20 },
  cancelBtnText: { color: Colors.primary, fontWeight: 'bold', fontSize: 16 },
  saveBtn: { backgroundColor: Colors.primary, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 20 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
