import mongoose from 'mongoose';

const chatbotLeadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    productTypeRequired: { type: String, required: true },
    message: { type: String, default: '' },
  },
  { timestamps: true }
);

export const ChatbotLead = mongoose.model('ChatbotLead', chatbotLeadSchema);
