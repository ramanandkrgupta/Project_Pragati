import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import os
from torch.utils.data import DataLoader
from .sequence_dataset import ProjectSequenceDataset
from .lstm_architecture import ProjectForecasterLSTM

def train_lstm_model():
    print("--- 03: LSTM TRAINING ---")
    
    output_dir = "output/data/time_series"
    model_dir = "output/models"
    os.makedirs(model_dir, exist_ok=True)
    
    print("Loading prepared time-series datasets...")
    X_train = np.load(f"{output_dir}/X_train.npy")
    y_train = np.load(f"{output_dir}/y_train.npy")
    X_test = np.load(f"{output_dir}/X_test.npy")
    y_test = np.load(f"{output_dir}/y_test.npy")
    
    train_dataset = ProjectSequenceDataset(X_train, y_train)
    test_dataset = ProjectSequenceDataset(X_test, y_test)
    
    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False)
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    
    # Input dim is 4 features: ['physical_progress', 'financial_progress', 'expenditure', 'revised_cost']
    # Output dim is 2 targets: ['revised_cost', 'physical_progress']
    model = ProjectForecasterLSTM(input_dim=4, hidden_dim=64, num_layers=2, output_dim=2, forecast_horizon=3)
    model.to(device)
    
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    
    num_epochs = 10
    
    print(f"Starting Training for {num_epochs} Epochs...")
    for epoch in range(num_epochs):
        model.train()
        train_loss = 0.0
        
        for batch_X, batch_y in train_loader:
            batch_X, batch_y = batch_X.to(device), batch_y.to(device)
            
            optimizer.zero_grad()
            outputs = model(batch_X)
            
            loss = criterion(outputs, batch_y)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item() * batch_X.size(0)
            
        train_loss /= len(train_loader.dataset)
        
        # Validation
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for batch_X, batch_y in test_loader:
                batch_X, batch_y = batch_X.to(device), batch_y.to(device)
                outputs = model(batch_X)
                loss = criterion(outputs, batch_y)
                val_loss += loss.item() * batch_X.size(0)
                
        val_loss /= len(test_loader.dataset)
        
        print(f"Epoch [{epoch+1}/{num_epochs}] | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f}")
        
    model_path = os.path.join(model_dir, "lstm_forecaster.pth")
    torch.save(model.state_dict(), model_path)
    print(f"Model successfully trained and saved to {model_path}")

if __name__ == "__main__":
    train_lstm_model()
