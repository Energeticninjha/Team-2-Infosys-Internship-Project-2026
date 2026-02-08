# NeuroFleetX Dashboard UI Standardization Guide

## Overview
This document outlines the standardized UI design system for all NeuroFleetX dashboards to ensure visual consistency across Admin, Manager, Driver, and Customer interfaces.

## Design System Location
**File**: `frontend/src/styles/dashboard.css`

This file contains all standardized:
- Color palette
- Typography
- Component styles
- Layout patterns
- Spacing and shadows

## Standardization Changes Required

### 1. Import Design System
Add to **ALL** dashboard files (AdminDashboard.js, ManagerDashboard.js, DriverDashboard.js, CustomerDashboard.js):

```javascript
import '../styles/dashboard.css';
```

### 2. Standardized Layout Structure

All dashboards should follow this consistent structure:

```jsx
<div className="nfx-dashboard">
    {/* Sidebar */}
    <div className="nfx-sidebar">
        <div className="nfx-sidebar-header">
            <h5 className="nfx-sidebar-title">🚗 NeuroFleetX</h5>
            <small className="nfx-sidebar-subtitle">[Role] Console</small>
        </div>
        
        <ul className="nfx-sidebar-nav">
            <li className="nfx-sidebar-nav-item">
                <button className={`nfx-sidebar-nav-link ${activeView === 'view1' ? 'active' : ''}`}>
                    📊 View Name
                </button>
            </li>
            {/* More nav items */}
        </ul>
        
        <div className="nfx-sidebar-footer">
            <div className="nfx-sidebar-user">
                <img src="..." className="nfx-sidebar-user-avatar" />
                <div>
                    <div className="nfx-sidebar-user-name">{userName}</div>
                    <div className="nfx-sidebar-user-role">{role}</div>
                </div>
            </div>
            <button className="btn nfx-btn-logout" onClick={logout}>Logout</button>
        </div>
    </div>
    
    {/* Main Content */}
    <div className="nfx-main-content">
        <div className="nfx-content-wrapper">
            <div className="nfx-page-header">
                <h2 className="nfx-page-title">Dashboard Title</h2>
                {/* Optional header actions */}
            </div>
            
            {/* Content goes here */}
        </div>
    </div>
</div>
```

### 3. Standardized Components

#### KPI Cards
Replace existing stat cards with:
```jsx
<div className="nfx-kpi-card">
    <div className="nfx-kpi-icon">📊</div>
    <div className="nfx-kpi-value">{value}</div>
    <div className="nfx-kpi-label">Label</div>
</div>
```

#### Data Cards
Replace existing cards with:
```jsx
<div className="nfx-card">
    <div className="nfx-card-header">
        <h5 className="nfx-card-title">Card Title</h5>
    </div>
    <div className="nfx-card-body">
        {/* Content */}
    </div>
</div>
```

#### Tables
Replace table classes:
```jsx
<table className="nfx-table table-hover align-middle">
    <thead>
        <tr>
            <th>Column</th>
        </tr>
    </thead>
    <tbody>
        {/* Rows */}
    </tbody>
</table>
```

### 4. Color Scheme Standardization

**Remove role-specific colors from navbars and sidebars:**

❌ **Before:**
- AdminDashboard: `bg-danger` (red)
- ManagerDashboard: `bg-warning` (yellow)
- CustomerDashboard: `bg-primary` (blue)
- DriverDashboard: `bg-primary` (blue)

✅ **After:**
- All dashboards: Use `nfx-sidebar` and `nfx-sidebar-header` classes
- Consistent blue gradient theme across all roles

**Keep role-specific accents for:**
- Status badges
- Action buttons (where contextually appropriate)
- Alert messages

### 5. Specific Changes by Dashboard

#### AdminDashboard.js
**Lines to Update:**
- Line 153: Replace `navbar navbar-dark bg-danger` with `nfx-navbar`
- Line 162: Replace `col-md-2 bg-dark` with `nfx-sidebar`
- Line 201: Replace `col-md-10 p-4 bg-light` with `nfx-main-content`
- Lines 220-260: Replace KPI cards with `nfx-kpi-card` structure
- Line 358+: Replace card classes with `nfx-card`

#### ManagerDashboard.js
**Lines to Update:**
- Line 108: Replace `bg-dark text-white p-3` with `nfx-sidebar`
- Line 109-112: Replace header div with `nfx-sidebar-header`
- Line 114-163: Replace nav structure with `nfx-sidebar-nav`
- Line 165-174: Replace footer with `nfx-sidebar-footer`
- Line 178: Replace `flex-grow-1 overflow-auto` with `nfx-main-content`
- Lines 189-208: Replace stat cards with `nfx-kpi-card`

#### CustomerDashboard.js
**Lines to Update:**
- Line 358: Replace `navbar navbar-dark bg-primary` with `nfx-navbar`
- Line 371: Replace sidebar structure (currently icon-only) - expand to full sidebar
- Line 389: Replace `col-md-4 p-4` with standard layout
- Keep map-focused layout but standardize sidebar

#### DriverDashboard.js
**Lines to Update:**
- Line 411: Replace `bg-dark text-white p-3` with `nfx-sidebar`
- Line 412-415: Replace header with `nfx-sidebar-header`
- Line 417-460: Update nav structure to use `nfx-sidebar-nav`
- Line 462-471: Replace footer with `nfx-sidebar-footer`
- Line 475: Replace `flex-grow-1 overflow-auto` with `nfx-main-content`
- Lines 516-570: Update telemetry cards to use `nfx-kpi-card`

### 6. Navbar Removal (Optional)

Since we're using a consistent sidebar, consider removing separate navbars from:
- AdminDashboard (line 153-158)
- CustomerDashboard (line 358-367)

The sidebar header serves as the branding element.

### 7. Animation Classes

Replace Bootstrap/custom animations with:
```jsx
<div className="nfx-fade-in">
    {/* Content */}
</div>
```

### 8. Button Standardization

Replace button classes:
```jsx
// Primary actions
<button className="btn nfx-btn nfx-btn-primary">Action</button>

// Logout buttons
<button className="btn nfx-btn-logout" onClick={logout}>Logout</button>
```

## Implementation Priority

1. **High Priority** (Visual Consistency):
   - Import dashboard.css in all files
   - Standardize sidebar structure
   - Standardize KPI cards
   - Remove role-specific navbar colors

2. **Medium Priority** (Polish):
   - Standardize all card components
   - Update table styles
   - Consistent button styles

3. **Low Priority** (Nice-to-have):
   - Animation standardization
   - Fine-tune spacing

## Testing Checklist

After implementing changes:
- [ ] All dashboards have consistent sidebar width (260px)
- [ ] All dashboards use blue gradient theme
- [ ] KPI cards have consistent size and hover effects
- [ ] Navigation items highlight correctly on active view
- [ ] User profile section appears in all sidebars
- [ ] Logout button styled consistently
- [ ] Tables have consistent styling
- [ ] Cards have consistent border-radius and shadows
- [ ] Responsive behavior works on mobile

## Benefits

✅ **Professional Appearance**: Consistent design across all roles  
✅ **Better UX**: Users can navigate any dashboard intuitively  
✅ **Maintainability**: Single source of truth for styles  
✅ **Scalability**: Easy to add new dashboards or components  
✅ **Brand Identity**: Cohesive NeuroFleetX visual language  

## Next Steps

1. Import `dashboard.css` in all dashboard components
2. Update one dashboard at a time (suggest starting with AdminDashboard)
3. Test each dashboard after changes
4. Verify responsive behavior
5. Get user feedback on consistency

---

**Note**: The design system maintains functional differences between dashboards (different views, features) while ensuring visual consistency (colors, layouts, components).
