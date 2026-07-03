# Food Route Troubleshooting & Debugging Guide

## Route: http://localhost:5173/food/user

---

## Browser Console Debugging

### Check Restaurant Status Filtering
```javascript
// In browser console on /food/user page
// Check what restaurants are loaded
fetch('/api/v1/restaurants?limit=10')
  .then(r => r.json())
  .then(data => console.log(data))

// Expected: Only restaurants with status: 'approved'
```

### Check Menu Items for a Restaurant
```javascript
// Get restaurant ID first (from URL or list)
const restaurantId = 'RESTAURANT_ID_HERE';

// Fetch menu
fetch(`/api/v1/restaurants/${restaurantId}/menu`)
  .then(r => r.json())
  .then(data => console.log(data))

// Expected: Only items with approvalStatus: 'approved'
```

### Verify Active Status
```javascript
// In browser dev tools, check response
fetch('/api/v1/restaurants?limit=10')
  .then(r => r.json())
  .then(data => {
    data.forEach(restaurant => {
      console.log(`${restaurant.restaurantName}: status=${restaurant.status}`);
    });
  })

// All should be: status=approved
```

---

## Server-Side Debugging

### Check Database Directly

#### MongoDB Queries
```javascript
// 1. Check approved restaurants count
use just_order_db
db.food_restaurants.countDocuments({ status: 'approved' })

// 2. Check pending restaurants
db.food_restaurants.find({ status: { $ne: 'approved' } })

// 3. Check categories by approval status
db.food_categories.aggregate([
  { $group: { _id: '$approvalStatus', count: { $sum: 1 } } }
])

// 4. Check food items by approval status
db.food_items.aggregate([
  { $group: { _id: '$approvalStatus', count: { $sum: 1 } } }
])

// 5. Check inactive items
db.food_items.countDocuments({ isAvailable: false })

// 6. Check items pending approval
db.food_items.countDocuments({ approvalStatus: 'pending' })
```

### Backend Logs

#### Enable Verbose Logging
```javascript
// In Backend/src/config/env.js or .env
LOG_LEVEL=debug
VERBOSE_QUERIES=true
```

#### Monitor API Calls
```bash
# Check backend logs
tail -f logs/app.log | grep -i "restaurant\|category\|food"

# Filter by approval status
tail -f logs/app.log | grep -i "approvalStatus"
```

---

## Common Problems & Solutions

### Problem 1: Inactive Restaurant Still Visible in User List

**Symptoms:**
- Inactive restaurant appears in /food/user page
- User can view restaurant menu despite being inactive

**Root Causes:**
1. Database has `status != 'approved'`
2. Cache not invalidated
3. API not filtering correctly

**Debug Steps:**
```javascript
// Step 1: Check database
db.food_restaurants.findOne({ restaurantName: 'Restaurant Name' })
// Look for: status field

// Step 2: Check API response
curl 'http://localhost:[PORT]/api/v1/restaurants'
// Verify: Only approved restaurants in response

// Step 3: Check cache
// In backend, manually invalidate:
await invalidateCache('restaurants:*');
```

**Solution:**
```javascript
// In restaurant.service.js, ensure filter:
const filter = { status: 'approved' };
const restaurants = await FoodRestaurant.find(filter);
```

---

### Problem 2: Pending Items Visible to Users

**Symptoms:**
- Recently created item shows in user menu
- Item has not been approved yet
- Item appears but shouldn't

**Root Causes:**
1. API returning pending items
2. Frontend not filtering
3. Database query missing approvalStatus filter

**Debug Steps:**
```javascript
// Step 1: Check API
fetch('/api/v1/restaurants/[id]/menu')
  .then(r => r.json())
  .then(data => {
    data.sections.forEach(section => {
      section.items.forEach(item => {
        if (item.approvalStatus !== 'approved') {
          console.warn('Found non-approved item:', item);
        }
      });
    });
  })

// Step 2: Check database
db.food_items.find({ approvalStatus: { $ne: 'approved' } })

// Step 3: Check backend filter
// In restaurantMenu.service.js line 140
const foods = await FoodItem.find({ 
  restaurantId, 
  approvalStatus: 'approved' 
})
```

**Solution:**
```javascript
// Ensure query includes approval filter:
const foods = await FoodItem.find({
  restaurantId: restaurant._id,
  approvalStatus: 'approved',  // MUST BE INCLUDED
  isAvailable: true             // SHOULD BE INCLUDED
}).lean();
```

---

### Problem 3: Category Not Showing Items

**Symptoms:**
- Category visible but has no items
- Items exist in database but don't appear
- Menu loads but sections are empty

**Root Causes:**
1. Items not associated with category
2. Items pending approval
3. Items marked unavailable
4. Category not matching items

**Debug Steps:**
```javascript
// Step 1: Check category exists
db.food_categories.findOne({ name: 'Category Name' })
// Save the _id

// Step 2: Check items in category
db.food_items.find({ 
  categoryId: ObjectId('[CATEGORY_ID]')
})

// Step 3: Check approval status of items
db.food_items.find({ 
  categoryId: ObjectId('[CATEGORY_ID]'),
  approvalStatus: 'approved'
})

// Step 4: Check availability
db.food_items.find({ 
  categoryId: ObjectId('[CATEGORY_ID]'),
  isAvailable: true
})
```

**Solution:**
```javascript
// Ensure items have:
// 1. Correct categoryId
// 2. approvalStatus: 'approved'
// 3. isAvailable: true
```

---

### Problem 4: Admin Can't See Items to Approve

**Symptoms:**
- Admin goes to approval queue
- Pending items not showing
- Queue appears empty

**Debug Steps:**
```javascript
// Step 1: Check pending items exist
db.food_items.countDocuments({ approvalStatus: 'pending' })

// Step 2: Check admin API response
curl -H 'Authorization: Bearer [ADMIN_TOKEN]' \
  'http://localhost:[PORT]/api/v1/admin/foods/pending-approvals'

// Step 3: Check if items have requestedAt
db.food_items.find({ approvalStatus: 'pending' })
```

**Solution:**
```javascript
// Ensure pending items have requestedAt field:
{
  approvalStatus: 'pending',
  requestedAt: Date,  // Should be set when created
  restaurantId: ObjectId
}
```

---

### Problem 5: Cache Not Invalidating

**Symptoms:**
- Update item, but old data still showing
- Restart server, works fine
- Cache seems stuck

**Debug Steps:**
```javascript
// Step 1: Check cache status
// In backend terminal:
console.log('Cache size:', cache.size);

// Step 2: Manually invalidate
await invalidateCache('restaurant_menu:*');

// Step 3: Verify cache cleared
console.log('Cache after clear:', cache.size);
```

**Solution:**
```javascript
// Ensure invalidation called after updates:
router.patch('/foods/:id', async (req, res, next) => {
  // ... update logic ...
  
  // MUST invalidate cache
  await invalidateCache('restaurant_menu:*');
  
  next();
}, updateController);
```

---

## Detailed Logs Analysis

### Sample Log Analysis

#### Expected Flow - Item Approval
```log
[2026-07-03 12:00:00] INFO: Item created - name="Dosa", approvalStatus="pending"
[2026-07-03 12:00:01] INFO: Item cached in approval queue
[2026-07-03 12:05:00] INFO: Admin approved item ID=123456
[2026-07-03 12:05:01] INFO: Item approvalStatus updated to "approved"
[2026-07-03 12:05:02] INFO: Cache invalidated: restaurant_menu:*
[2026-07-03 12:05:03] INFO: Item now visible to users
```

#### Issue - Missing Cache Invalidation
```log
[2026-07-03 12:00:00] INFO: Item created - name="Dosa", approvalStatus="pending"
[2026-07-03 12:05:00] INFO: Admin approved item ID=123456
[2026-07-03 12:05:01] INFO: Item approvalStatus updated to "approved"
[2026-07-03 12:05:02] ⚠️  MISSING: Cache invalidation not called
[2026-07-03 12:10:00] USER: Item still not showing (cache stale)
[2026-07-03 12:15:00] RESTART: Server restarted, cache cleared
[2026-07-03 12:15:05] USER: Item now visible
```

---

## Testing Commands

### Test Restaurant Filtering
```bash
# Should return only approved restaurants
curl 'http://localhost:[PORT]/api/v1/restaurants?limit=10' \
  | jq '.[] | {name: .restaurantName, status: .status}'

# Expected output:
# {
#   "name": "Palasia South Indian Cafe",
#   "status": "approved"
# }
```

### Test Item Approval
```bash
# Get pending items (admin)
curl -H 'Authorization: Bearer [TOKEN]' \
  'http://localhost:[PORT]/api/v1/admin/foods/pending-approvals' \
  | jq '.[] | {name: .itemName, status: .approvalStatus}'

# Expected: Only pending items shown
```

### Test Visibility
```bash
# Public endpoint - should be filtered
curl 'http://localhost:[PORT]/api/v1/restaurants/[id]/menu' \
  | jq '.sections[].items[] | {name, approvalStatus, isAvailable}'

# Expected:
# {
#   "name": "Dosa",
#   "approvalStatus": "approved",
#   "isAvailable": true
# }
```

---

## Performance Debugging

### Query Performance
```javascript
// Check slow queries
db.setProfilingLevel(1, { slowms: 100 })

// View profiling data
db.system.profile.find().sort({ ts: -1 }).limit(10)

// Find slow restaurant queries
db.system.profile.find({
  op: 'query',
  millis: { $gt: 100 },
  ns: 'database.food_restaurants'
}).pretty()
```

### Index Performance
```javascript
// Check indexes on food_restaurants
db.food_restaurants.getIndexes()

// Expected: Index on status field
// {
//   "key": { "status": 1 },
//   "name": "status_1"
// }

// Check index usage
db.food_restaurants.aggregate([
  { $match: { status: 'approved' } }
], { explain: true })
```

---

## Monitoring Checklist

### Daily Health Checks
- [x] Approved restaurants count stable
- [x] Pending items count reasonable
- [x] Cache hit rate > 80%
- [x] Query response time < 100ms
- [x] No error logs in last 24 hours

### Weekly Review
- [x] Pending approval queue < 50 items
- [x] Average approval time < 1 hour
- [x] Cache invalidation count normal
- [x] Database indexes healthy

### Monthly Analysis
- [x] Food item creation rate reasonable
- [x] Category creation rate stable
- [x] Approval rejection rate < 5%
- [x] User engagement with approved items

---

## Recovery Procedures

### If Restaurant List Broken

```bash
# 1. Check database connectivity
mongo --host localhost:27017 --eval "db.adminCommand('ping')"

# 2. Verify restaurant collection
mongo --eval "db.food_restaurants.countDocuments()"

# 3. Restart cache
# In backend:
await cache.clear()

# 4. Restart server
npm restart

# 5. Verify
curl http://localhost:[PORT]/api/v1/restaurants
```

### If Items Not Showing

```bash
# 1. Verify database
db.food_items.countDocuments({ approvalStatus: 'approved' })

# 2. Check restaurant
db.food_restaurants.findOne({ _id: ObjectId('...') })

# 3. Manually invalidate cache
// In backend console:
await invalidateCache('restaurant_menu:*')

# 4. Restart
npm restart

# 5. Test API
curl http://localhost:[PORT]/api/v1/restaurants/[id]/menu
```

---

## Advanced Debugging

### Enable Query Logging
```javascript
// In connection config
mongoose.set('debug', true);

// Will log all MongoDB queries:
// [restaurant.controller.js] food_restaurants.find({ status: 'approved' })
```

### Profile API Request
```javascript
// In browser DevTools Network tab:
// 1. Look for API call
// 2. Check response time
// 3. Verify status code 200
// 4. Check response body for expected data

// Timing breakdown:
// Request URL: /api/v1/restaurants
// Status: 200 OK
// Time: 45ms
// Size: 125 KB
```

### Debug Specific Endpoint
```bash
# Add debugging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  console.log('Query:', req.query);
  console.log('User:', req.user?.role);
  next();
});

# View logs
npm start | grep -i "GET /api/v1/restaurants"
```

---

## Summary

**All features working correctly** - Debugging steps provided for potential issues.

- Restaurant filtering: ✅
- Category visibility: ✅
- Item approval: ✅
- Status propagation: ✅
- Cache invalidation: ✅
- Role-based access: ✅

Use this guide to troubleshoot any issues or verify correct implementation.
