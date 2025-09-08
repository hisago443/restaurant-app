# **App Name**: Up & Above Assistant

## Core Features:

- Menu Display: Display menu categories and items from a JSON file in a responsive layout. Dynamically populate the menu and categories on the left panel.
- Order Summary: Display selected items with quantity and dynamic discount options (0%, 5%, 10%, 15%, 20%).
- Receipt Generation: Generate a dynamically updated receipt preview with item details, discounts, and total. The assistant uses reasoning to decide when the discount is included using a tool, as the display should only be removed when it is 0%.
- Real-time Search: Implement a search bar that instantly filters menu items.
- Payment Processing: Simulate payment processing, including cash payment with change calculation.
- Table Management: Display a grid of tables with color-coded statuses (Available, Occupied, Reserved, Cleaning).
- Kitchen Order Updates: Panels for pending, in preparation, and completed orders with status update buttons.

## Style Guidelines:

- Primary color: Soft lavender (#E6E6FA) for a calming and inviting atmosphere, reflecting the café's ambiance.
- Background color: Light grey (#F0F0F0), a very desaturated lavender, providing a clean and unobtrusive backdrop.
- Accent color: Pale pink (#FADADD), a more saturated analogous color that complements the lavender, creating visual interest without being overwhelming. This is a good option for highlighting discounts.
- Body and headline font: 'PT Sans' (sans-serif) for a modern yet readable style throughout the application.
- Use simple, outlined icons to represent menu categories and actions for clarity.
- Implement a responsive design that adapts to desktop and tablet sizes. Ensure that scrollbars only appear when content overflows to maintain a clean interface.
- Add subtle animations, such as smooth transitions between tabs or highlighting selected items, to enhance user engagement.