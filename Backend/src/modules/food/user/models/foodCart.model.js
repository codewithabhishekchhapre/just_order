import mongoose from 'mongoose';

const foodCartItemSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodItem',
      required: true,
      index: true,
    },
    variantId: { type: String, default: '', trim: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: true }
);

const foodCartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodUser',
      required: true,
      unique: true,
      index: true,
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodRestaurant',
      default: null,
      index: true,
    },
    items: { type: [foodCartItemSchema], default: [] },
    couponCode: { type: String, default: '', trim: true, uppercase: true },
  },
  {
    collection: 'food_carts',
    timestamps: true,
  }
);

foodCartSchema.index({ userId: 1, 'items.itemId': 1, 'items.variantId': 1 });

export const FoodCart = mongoose.model('FoodCart', foodCartSchema, 'food_carts');
