import { useState, useCallback } from 'react';
import { SaleTransaction } from '../types';
import { generateEscPosBuffer } from '../utils/escpos';

export type PrinterConnectionType = 'NONE' | 'WEBUSB' | 'WEBSERIAL' | 'BROWSER_DIALOG';

export function useThermalPrinter() {
  const [connectionType, setConnectionType] = useState<PrinterConnectionType>('BROWSER_DIALOG');
  const [printerDeviceName, setPrinterDeviceName] = useState<string>('Standard 80mm Virtual Receipt');
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [lastPrintStatus, setLastPrintStatus] = useState<string>('');

  // 1. Connect via WebUSB API
  const connectWebUsb = useCallback(async () => {
    try {
      if (!('usb' in navigator)) {
        alert('WebUSB is not supported in this browser. Please use Chrome/Edge or standard browser print.');
        return false;
      }

      // Request USB thermal printer
      const device = await (navigator as any).usb.requestDevice({ filters: [] });
      await device.open();
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }
      await device.claimInterface(0);

      setConnectionType('WEBUSB');
      setPrinterDeviceName(device.productName || 'USB Thermal ESC/POS Printer');
      setLastPrintStatus('Connected via WebUSB');
      return true;
    } catch (err: any) {
      console.warn('WebUSB connection canceled or failed:', err);
      setLastPrintStatus(`USB Connect Failed: ${err.message}`);
      return false;
    }
  }, []);

  // 2. Connect via WebSerial API
  const connectWebSerial = useCallback(async () => {
    try {
      if (!('serial' in navigator)) {
        alert('WebSerial is not supported in this browser. Please use Chrome/Edge.');
        return false;
      }

      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 }); // standard ESC/POS baud rate

      setConnectionType('WEBSERIAL');
      setPrinterDeviceName('COM/Serial 80mm Thermal Printer');
      setLastPrintStatus('Connected via WebSerial');
      return true;
    } catch (err: any) {
      console.warn('WebSerial connection canceled or failed:', err);
      setLastPrintStatus(`Serial Connect Failed: ${err.message}`);
      return false;
    }
  }, []);

  // 3. Print ESC/POS receipt
  const printReceipt = useCallback(async (sale: SaleTransaction) => {
    setIsPrinting(true);
    setLastPrintStatus('Preparing ESC/POS raw payload...');

    try {
      const buffer = generateEscPosBuffer(sale);

      if (connectionType === 'WEBUSB' && (navigator as any).usb) {
        // Find existing authorized USB devices
        const devices = await (navigator as any).usb.getDevices();
        if (devices.length > 0) {
          const device = devices[0];
          if (!device.opened) await device.open();
          // Send transfer to out endpoint (typically endpoint 1 or 2)
          await device.transferOut(1, buffer);
          setLastPrintStatus('Dispatched ESC/POS to WebUSB Printer');
          setIsPrinting(false);
          return true;
        }
      }

      if (connectionType === 'WEBSERIAL' && (navigator as any).serial) {
        const ports = await (navigator as any).serial.getPorts();
        if (ports.length > 0) {
          const port = ports[0];
          const writer = port.writable.getWriter();
          await writer.write(buffer);
          writer.releaseLock();
          setLastPrintStatus('Dispatched ESC/POS to WebSerial Printer');
          setIsPrinting(false);
          return true;
        }
      }

      // Default/Fallback: Trigger standard formatted browser print
      setLastPrintStatus('Rendered 80mm receipt for browser print dialog');
      window.print();
      setIsPrinting(false);
      return true;
    } catch (err: any) {
      console.error('Print failure:', err);
      setLastPrintStatus(`Print Error: ${err.message}`);
      // Fallback
      window.print();
      setIsPrinting(false);
      return false;
    }
  }, [connectionType]);

  return {
    connectionType,
    printerDeviceName,
    isPrinting,
    lastPrintStatus,
    connectWebUsb,
    connectWebSerial,
    printReceipt
  };
}
