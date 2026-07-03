# Quick Reference: Food Management Feature

## Route: http://localhost:5173/food/user

### 🟢 What's Working

| Component | Status | Notes |
|-----------|--------|-------|
| Restaurant Display | ✅ | Only approved restaurants shown |
| Categories | ✅ | Full CRUD + approval workflow |
| Menu Items | ✅ | Full CRUD + approval workflow |
| Add/Edit/Delete | ✅ | All operations functional |
| Active/Inactive | ✅ | Status propagates correctly |
| Admin Controls | ✅ | Full management capabilities |
| Owner Controls | ✅ | Can manage own entities |
| Role-Based Access | ✅ | Permissions properly enforced |
| Cache Invalidation | ✅ | Working as expected |

---

## Key Files

### Frontend
- Route: `/Frontend/src/modules/Food/pages/user/`
- Restaurant Detail: `/Frontend/src/modules/Food/pages/user/restaurants/`
- Product Detail: `ProductDetail.jsx`

### Backend Routes
- Public: `Backend/src/modules/food/restaurant/routes/restaurant.routes.js`
- Admin: `Backend/src/modules/food/admin/routes/admin.routes.js`
- Owner: `Backend/src/modules/food/restaurant/routes/restaurant.routes.js`

### Backend Services
- Restaurant: `restaurant.service.js`
- Menu: `restaurantMenu.service.js`
- Categories: `restaurantCategory.service.js`
- Foods: `restaurantFood.service.js`
- Approval: `foodApproval.service.js`

### Database Models
- Restaurant: `food_restaurants`
- Categories: `food_categories`
- Items: `food_items`

---

## Approval Workflow

### Category Workflow
```
Restaurant Owner Creates Category
    ↓
Status: pending (awaits approval)
    ↓
Admin Reviews & Approves
    ↓
Status: approved
    ↓
Visible in User Menu
```

### Food Item Workflow
```
Restaurant Owner Creates Item
    ↓
Status: pending (awaits approval)
    ↓
Admin Reviews & Approves
    ↓
Status: approved
    ↓
Visible in User Menu
    ↓
(Optional) Admin Toggles isAvailable
    ↓
Item Hidden/Shown to Users
```

---

## API Quick Reference

### Public APIs (No Auth)
```
GET /api/v1/restaurants
GET /api/v1/restaurants/:id
GET /api/v1/restaurants/:id/menu
GET /api/v1/restaurants/categories/public
```

### Restaurant Owner APIs
```
POST /api/v1/restaurants/categories
PATCH /api/v1/restaurants/categories/:id
DELETE /api/v1/restaurants/categories/:id
POST /api/v1/restaurants/foods
PATCH /api/v1/restaurants/foods/:id
```

### Admin APIs
```
PATCH /api/v1/admin/categories/:id/approve
PATCH /api/v1/admin/categories/:id/reject
PATCH /api/v1/admin/categories/:id/toggle
PATCH /api/v1/admin/foods/:id/approve
PATCH /api/v1/admin/foods/:id/reject
GET /api/v1/admin/foods/pending-approvals
```

---

## Status Fields

### Restaurants
- `status`: approved | pending | rejected

### Categories
- `approvalStatus`: pending | approved | rejected
- `isActive`: true | false

### Menu Items
- `approvalStatus`: pending | approved | rejected
- `isAvailable`: true | false
- `foodType`: Veg | Non-Veg

---

## User Sees
```javascript
// Only items matching ALL these conditions:
{
  restaurant: { status: 'approved' },
  category: { isActive: true, approvalStatus: 'approved' },
  item: { approvalStatus: 'approved', isAvailable: true }
}
```

---

## Admin Sees
```javascript
// Everything - all statuses visible
// Can approve, reject, or toggle status
```

---

## Owner Sees
```javascript
// Own restaurant items with all statuses
// Can create/edit/delete own items
// Cannot approve (admin-only)
```

---

## Cache Keys
- `restaurants:*` - Restaurant list
- `restaurant_detail:*` - Restaurant details
- `restaurant_menu:*` - Restaurant menu
- `categories:*` - Categories
- `offers:*` - Offers

Cache invalidated on:
- Restaurant profile update
- Restaurant availability change
- Menu/food item changes
- Category updates

---

## Testing Checklist

- [x] Restaurants display correctly
- [x] Categories visible in restaurant menu
- [x] Menu items display with correct details
- [x] Veg/Non-Veg filter works
- [x] Restaurant owner can add categories
- [x] Admin can approve/reject categories
- [x] Admin can toggle category status
- [x] Restaurant owner can add items
- [x] Admin can approve/reject items
- [x] Admin can toggle item availability
- [x] Inactive items hidden from users
- [x] Pending items hidden from users
- [x] Role-based access working
- [x] Cache invalidation working

---

## Performance Notes
- Restaurant queries: Indexed on `status`
- Category queries: Indexed on `approvalStatus`, `restaurantId`
- Item queries: Indexed on `approvalStatus`, `restaurantId`
- Pagination supported: limit (1-1000), page

---

## Common Issues & Solutions

### Issue: Item not showing in menu
- Check: `approvalStatus = 'approved'`
- Check: `isAvailable = true`
- Check: Restaurant `status = 'approved'`
- Check: Category `isActive = true`

### Issue: Pending item appears in user view
- Check API returns: Only `approvalStatus: 'approved'` items
- Check cache: May need manual invalidation

### Issue: Category not editable by owner
- Check: Only admin can change approval status
- Owner can only edit name, image, etc.

---

## Development Endpoints

### Local Testing
```
Frontend: http://localhost:5173/food/user
Backend: http://localhost:[PORT]/api/v1/
Admin: http://localhost:[PORT]/api/v1/admin/
```

### Test Restaurant
```
URL: /food/user/restaurants/palasia-south-indian-cafe
Categories: South Indian, Beverages
Items: Uttapam, Medu Vada, Idli Sambar, Masala Dosa, Filter Coffee
```

---

## Summary

✅ **Feature Status: PRODUCTION READY**

All restaurant, category, and menu item management features are working correctly with proper active/inactive status control and approval workflows.

The system properly implements:
- Multi-level approval workflows
- Status-based filtering
- Role-based access control
- Efficient caching
- Data consistency

Ready for production deployment.
