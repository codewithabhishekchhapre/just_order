# Delivery Time Feature - Quick Testing Guide

## Feature Overview
✨ **When a user has multiple items in cart, the delivery time shown is based on the highest-priced item's preparation time.**

## What Changed

### Before
```
Delivery in: 10-15 mins (restaurant default)
```

### After
```
Delivery in: 25 mins (highest priced item's prep time)
Estimated time based on [Item Name]
```

---

## Testing Scenarios

### Scenario 1: Single Item Cart ✅
**Setup**: Add one item to cart
- Item: Pizza (₹250, prep: "15 mins")

**Expected Display**:
- "Delivery in 15 mins"
- "Estimated time based on Pizza"

**Action**: Add to cart and go to cart page

---

### Scenario 2: Multiple Items - Different Prices ✅
**Setup**: Add multiple items with different prices
- Item A: Biryani (₹300, prep: "25 mins")
- Item B: Dessert (₹100, prep: "5 mins")
- Item C: Bread (₹50, prep: "3 mins")

**Expected Display**:
- "Delivery in 25 mins" (Biryani is highest at ₹300)
- "Estimated time based on Biryani"

**Action**: Add all items and verify cart display

---

### Scenario 3: Same Price, Different Prep Times ✅
**Setup**: Items with same price but different prep times
- Item A: Pizza (₹250, prep: "15 mins")
- Item B: Noodles (₹250, prep: "10 mins")

**Expected Display**:
- "Delivery in 15 mins" (Pizza comes first in price, so its 15 mins)

**Action**: Add both items

---

### Scenario 4: Time Range Format ✅
**Setup**: Item with range prep time
- Item: Biryani (₹300, prep: "20-25 mins")

**Expected Display**:
- "Delivery in 20-25 mins"

**Action**: Verify display shows the range

---

### Scenario 5: No Prep Time on Item ✅
**Setup**: Item without preparationTime field
- Item: Burger (₹200, no prep time)

**Expected Display**:
- Falls back to restaurant's "estimatedDeliveryTime"
- If no restaurant data, shows "15-20 mins"

**Action**: Add item and check fallback

---

### Scenario 6: Add/Remove Items ✅
**Setup**: Start with one item, then add another
- Start: Pizza (₹250, prep: "15 mins")
- Add: Biryani (₹350, prep: "25 mins")

**Expected**:
- Initial: "Delivery in 15 mins"
- After adding: "Delivery in 25 mins" (updates to Biryani)

**Action**: Watch delivery time update dynamically

---

### Scenario 7: Header vs Main Display ✅
**Setup**: Any cart state

**Expected**:
- Cart header shows delivery time: "25 mins to Location"
- Main delivery box shows: "Delivery in 25 mins"
- Both show same time

**Action**: Scroll and verify both locations show consistent time

---

## Files to Check

### 1. Utility Functions
**File**: `Frontend/src/modules/Food/utils/cartUtils.js`

**Quick Test in Browser Console**:
```javascript
// Test utility functions exist
console.log(typeof getHighestPricedItem) // Should be 'function'
console.log(typeof getMaxDeliveryTime) // Should be 'function'
console.log(typeof parseTimeToMinutes) // Should be 'function'
```

### 2. Cart Component
**File**: `Frontend/src/modules/Food/pages/user/cart/Cart.jsx`

**Look for**:
- Import line: `import { getMaxDeliveryTime, getHighestPricedItem }`
- Usage line ~2121: `getMaxDeliveryTime(cart, restaurantData)`
- Usage line ~2252: `{getMaxDeliveryTime(cart, restaurantData)}`
- Text line ~2257: Shows item name

---

## Testing with Browser DevTools

### 1. Check Cart State
```javascript
// In browser console on cart page:
// (if using React DevTools or similar)

// Log cart items
console.log('Cart:', cart)

// Find highest priced
const highest = cart.reduce((max, item) => 
  item.price > max.price ? item : max
)
console.log('Highest priced:', highest)
```

### 2. Test Prep Time Parsing
```javascript
// Test time parsing
parseTimeToMinutes("15 mins") // Should return 15
parseTimeToMinutes("20-25 mins") // Should return 25
parseTimeToMinutes("30") // Should return 30
```

### 3. Network Check
```javascript
// Verify item data includes preparationTime
// Check network tab when loading restaurant menu
// Look for preparationTime field in food items

// Example item structure:
{
  id: "123",
  name: "Biryani",
  price: 350,
  preparationTime: "25 mins",  // ← Should be present
  isAvailable: true,
  ...
}
```

---

## UI Verification Checklist

| Item | Location | Check |
|------|----------|-------|
| Delivery time | Cart header | Shows highest item's prep time |
| Delivery time | Main delivery box | Shows same as header |
| Item name | Below delivery box | Shows "Estimated time based on [Name]" |
| Fallback | Empty cart | Shows "15-20 mins" |
| Update | After adding item | Time updates immediately |
| Format | With range prep time | Shows "20-25 mins" |

---

## Mobile Testing

**Viewport**: Test on mobile breakpoints
- [ ] Cart header on mobile
- [ ] Delivery time display responsive
- [ ] Item name fits without overflow
- [ ] Alignment proper on small screens

---

## Edge Cases to Test

### Empty Cart
- [ ] Shows default "15-20 mins"
- [ ] No error in console

### All Items Same Price
- [ ] Uses first item in array
- [ ] Shows its prep time
- [ ] No crashes

### Items Without Prep Time
- [ ] Falls back to restaurant data
- [ ] No errors

### Very Long Item Names
- [ ] Text wraps properly
- [ ] "Estimated time based on..." fits
- [ ] Mobile friendly

### Rapid Add/Remove
- [ ] Time updates correctly
- [ ] No lag or errors
- [ ] DOM updates smoothly

---

## Expected User Experience

### Journey 1: Normal Order
1. User browses menu
2. Adds Biryani (highest price)
3. Adds some sides
4. Goes to cart
5. Sees: "Delivery in 25 mins based on Biryani"
6. Understands this is estimate based on most expensive item
7. Knows sides will be ready by then

### Journey 2: Budget Order
1. User adds multiple cheap items
2. All have short prep times
3. Shows quick delivery
4. Realistic expectation set

### Journey 3: Special Item Order
1. User adds one premium item
2. It has longest prep time
3. System correctly identifies it
4. Shows accurate time
5. User happy with clarity

---

## Performance Metrics

**Should be instant** (< 50ms):
- Getting highest priced item
- Calculating delivery time
- Re-rendering with new time

**Measure with**:
```javascript
console.time('delivery-calc')
getMaxDeliveryTime(cart, restaurantData)
console.timeEnd('delivery-calc')
```

---

## Success Criteria

✅ **Pass if**:
- Delivery time updates based on highest priced item
- Item name displays in UI
- Both header and main display match
- No console errors
- Works on mobile
- Fallbacks work correctly
- Performance is instant
- User understands the logic

❌ **Fail if**:
- Uses wrong item's prep time
- Item name doesn't show
- Header and main time don't match
- Console has errors
- Mobile display broken
- Always shows fallback
- Slow calculation
- User confused

---

## Quick Test Command

**Copy-paste into browser console** on cart page:
```javascript
// Quick verification
console.log('=== DELIVERY TIME FEATURE TEST ===')
console.log('Cart items:', cart?.length || 0)
console.log('Highest priced:', getHighestPricedItem(cart)?.name)
console.log('Delivery time:', getMaxDeliveryTime(cart, restaurantData))
console.log('✅ Feature loaded!')
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Always shows "15-20 mins" | Check items have `preparationTime` field |
| Wrong item selected | Verify price field exists and populated |
| Item name doesn't show | Check item has `name` field |
| Time doesn't update | Check cart state is updating |
| Console errors | Check import paths are correct |

---

## Sign-Off Checklist

- [ ] Single item cart works
- [ ] Multiple items shows highest price item time
- [ ] Item name displays correctly  
- [ ] Header and main display match
- [ ] Fallbacks work
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Performance acceptable
- [ ] User message clear
- [ ] Ready for production

---

**Testing Date**: ________________
**Tested By**: ________________  
**Environment**: ________________
**Status**: ✅ PASS / ❌ FAIL

---

For detailed implementation info, see: `DELIVERY_TIME_IMPLEMENTATION_GUIDE.md`
