import torch
import torch.nn as nn

class ProjectForecasterLSTM(nn.Module):
    def __init__(self, input_dim=4, hidden_dim=64, num_layers=2, output_dim=2, forecast_horizon=3):
        super(ProjectForecasterLSTM, self).__init__()
        
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.forecast_horizon = forecast_horizon
        self.output_dim = output_dim
        
        # The LSTM layer takes sequences of input_dim features
        self.lstm = nn.LSTM(
            input_size=input_dim, 
            hidden_size=hidden_dim, 
            num_layers=num_layers, 
            batch_first=True,
            dropout=0.2 if num_layers > 1 else 0
        )
        
        # Fully connected layer to map LSTM hidden state to our forecast horizon x output_dim
        self.fc = nn.Linear(hidden_dim, forecast_horizon * output_dim)
        
    def forward(self, x):
        # x shape: (Batch_Size, Sequence_Length, Input_Dim)
        
        # Initialize hidden state with zeros
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_dim).to(x.device)
        
        # Initialize cell state
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_dim).to(x.device)
        
        # We need to detach as we are doing truncated backpropagation through time (BPTT)
        out, _ = self.lstm(x, (h0.detach(), c0.detach()))
        
        # Get the output from the last time step
        # out[:, -1, :] shape: (Batch_Size, Hidden_Dim)
        out = self.fc(out[:, -1, :])
        
        # Reshape to (Batch_Size, Forecast_Horizon, Output_Dim)
        out = out.view(x.size(0), self.forecast_horizon, self.output_dim)
        
        return out
