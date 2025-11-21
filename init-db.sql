-- Create Database
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'DroneDeliveryDB')
BEGIN
    CREATE DATABASE DroneDeliveryDB;
END
GO

USE DroneDeliveryDB;
GO

-- Enable snapshot isolation
ALTER DATABASE DroneDeliveryDB SET ALLOW_SNAPSHOT_ISOLATION ON;
ALTER DATABASE DroneDeliveryDB SET READ_COMMITTED_SNAPSHOT ON;
GO

PRINT 'Database DroneDeliveryDB created successfully';
GO