import { EMILoan } from '../types';

// All EMI loans from Fleet Master (Finance status only)
// Debited account "Kishan Enterprise ICICI" maps to entity "Kishan Enterprise | ICICI"
export const EMI_LOANS: EMILoan[] = [
  // --- Eicher ---
  { truckNo: 'GJ05BZ7979', make: 'Eicher', model: '6048 Pro', year: 2019, owner: 'Kishan Enterprise', financier: 'AXIS BANK', loanTenure: 48, emiStartDate: '2024-06-20', emiDayOfMonth: 20, emiAmount: 66622, emisPaid: 20, remainingEmis: 28, emiEndDate: '2028-06-20', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'GJ05BZ7474', make: 'Eicher', model: '6048 Pro', year: 2019, owner: 'Kishan Enterprise', financier: 'AXIS BANK', loanTenure: 48, emiStartDate: '2024-06-20', emiDayOfMonth: 20, emiAmount: 66622, emisPaid: 20, remainingEmis: 28, emiEndDate: '2028-06-20', debitedAccount: 'Kishan Enterprise ICICI' },
  // --- Bharat Benz ---
  { truckNo: 'GJ16AW4342', make: 'Bharat Benz', model: '3723T', year: 2019, owner: 'Kishan Enterprise', financier: 'TATA MOTORS FIN', loanTenure: 48, emiStartDate: '2022-07-15', emiDayOfMonth: 15, emiAmount: 56110, emisPaid: 43, remainingEmis: 5, emiEndDate: '2026-07-15', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'GJ05CU8686', make: 'Bharat Benz', model: '3723T', year: 2018, owner: 'Kishan Enterprise', financier: 'HDFC BANK LTD', loanTenure: 48, emiStartDate: '2022-12-20', emiDayOfMonth: 20, emiAmount: 46744, emisPaid: 38, remainingEmis: 10, emiEndDate: '2026-12-20', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'GJ05CU9454', make: 'Bharat Benz', model: '3723T', year: 2018, owner: 'Kishan Enterprise', financier: 'HDFC BANK LTD', loanTenure: 48, emiStartDate: '2023-03-20', emiDayOfMonth: 20, emiAmount: 46744, emisPaid: 35, remainingEmis: 13, emiEndDate: '2027-03-20', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'GJ05CU7311', make: 'Bharat Benz', model: '3723T', year: 2018, owner: 'Kishan Enterprise', financier: 'HDFC BANK LTD', loanTenure: 48, emiStartDate: '2023-04-20', emiDayOfMonth: 20, emiAmount: 46744, emisPaid: 34, remainingEmis: 14, emiEndDate: '2027-04-20', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'GJ16AW4195', make: 'Bharat Benz', model: '4928T', year: 2018, owner: 'Kishan Enterprise', financier: 'ICICI BANK', loanTenure: 35, emiStartDate: '2023-11-15', emiDayOfMonth: 15, emiAmount: 60672, emisPaid: 27, remainingEmis: 8, emiEndDate: '2026-10-15', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'GJ16AW4281', make: 'Bharat Benz', model: '4928T', year: 2018, owner: 'Kishan Enterprise', financier: 'ICICI BANK', loanTenure: 35, emiStartDate: '2023-11-15', emiDayOfMonth: 15, emiAmount: 60672, emisPaid: 27, remainingEmis: 8, emiEndDate: '2026-10-15', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'GJ16AW3424', make: 'Bharat Benz', model: '3723T', year: 2017, owner: 'Kishan Enterprise', financier: 'ICICI BANK', loanTenure: 36, emiStartDate: '2023-09-15', emiDayOfMonth: 15, emiAmount: 54391, emisPaid: 29, remainingEmis: 7, emiEndDate: '2026-09-15', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'GJ16AW2196', make: 'Bharat Benz', model: '3723T', year: 2018, owner: 'Kishan Enterprise', financier: 'ICICI BANK', loanTenure: 48, emiStartDate: '2023-05-15', emiDayOfMonth: 15, emiAmount: 51205, emisPaid: 33, remainingEmis: 15, emiEndDate: '2027-05-15', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'GJ16AW4528', make: 'Bharat Benz', model: '4928T', year: 2018, owner: 'Kishan Enterprise', financier: 'ICICI BANK', loanTenure: 35, emiStartDate: '2024-01-15', emiDayOfMonth: 15, emiAmount: 59715, emisPaid: 25, remainingEmis: 10, emiEndDate: '2026-12-15', debitedAccount: 'Kishan Enterprise ICICI' },
  // --- MAHENDRA BLAZO ---
  { truckNo: 'GJ32T3937', make: 'MAHENDRA', model: 'BLAZO', year: 2018, owner: 'Kishan Enterprise', financier: 'TATA MOTORS FIN', loanTenure: 47, emiStartDate: '2024-02-02', emiDayOfMonth: 2, emiAmount: 52065, emisPaid: 24, remainingEmis: 23, emiEndDate: '2028-01-02', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'GJ32T3815', make: 'MAHENDRA', model: 'BLAZO', year: 2018, owner: 'Kishan Enterprise', financier: 'TATA MOTORS FIN', loanTenure: 47, emiStartDate: '2024-02-02', emiDayOfMonth: 2, emiAmount: 52015, emisPaid: 24, remainingEmis: 23, emiEndDate: '2028-01-02', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'GJ32T3745', make: 'MAHENDRA', model: 'BLAZO', year: 2018, owner: 'Kishan Enterprise', financier: 'TATA MOTORS FIN', loanTenure: 47, emiStartDate: '2024-02-02', emiDayOfMonth: 2, emiAmount: 52015, emisPaid: 24, remainingEmis: 23, emiEndDate: '2028-01-02', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'GJ32T3680', make: 'MAHENDRA', model: 'BLAZO', year: 2018, owner: 'Kishan Enterprise', financier: 'TATA MOTORS FIN', loanTenure: 47, emiStartDate: '2024-02-02', emiDayOfMonth: 2, emiAmount: 52015, emisPaid: 24, remainingEmis: 23, emiEndDate: '2028-01-02', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'GJ32T3525', make: 'MAHENDRA', model: 'BLAZO', year: 2018, owner: 'Kishan Enterprise', financier: 'TATA MOTORS FIN', loanTenure: 47, emiStartDate: '2024-02-02', emiDayOfMonth: 2, emiAmount: 50360, emisPaid: 24, remainingEmis: 23, emiEndDate: '2028-01-02', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'GJ32T3566', make: 'MAHENDRA', model: 'BLAZO', year: 2018, owner: 'Kishan Enterprise', financier: 'TATA MOTORS FIN', loanTenure: 47, emiStartDate: '2024-02-02', emiDayOfMonth: 2, emiAmount: 50360, emisPaid: 24, remainingEmis: 23, emiEndDate: '2028-01-02', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'GJ32T3682', make: 'MAHENDRA', model: 'BLAZO', year: 2018, owner: 'Kishan Enterprise', financier: 'TATA MOTORS FIN', loanTenure: 47, emiStartDate: '2024-02-02', emiDayOfMonth: 2, emiAmount: 50360, emisPaid: 24, remainingEmis: 23, emiEndDate: '2028-01-02', debitedAccount: 'Kishan Enterprise ICICI' },
  // --- TATA ---
  { truckNo: 'GJ16AY2868', make: 'TATA', model: '', year: 0, owner: 'Kishan Enterprise', financier: 'TATA MOTORS FIN', loanTenure: 47, emiStartDate: '2025-05-02', emiDayOfMonth: 2, emiAmount: 62250, emisPaid: 9, remainingEmis: 38, emiEndDate: '2029-04-02', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'GJ16AY2282', make: 'TATA', model: '4825', year: 2020, owner: 'Kishan Enterprise', financier: 'TATA MOTORS FIN', loanTenure: 47, emiStartDate: '2025-04-15', emiDayOfMonth: 15, emiAmount: 73665, emisPaid: 10, remainingEmis: 37, emiEndDate: '2029-03-15', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'GJ16AY2258', make: 'TATA', model: '4825', year: 2020, owner: 'Kishan Enterprise', financier: 'TATA MOTORS FIN', loanTenure: 47, emiStartDate: '2025-04-15', emiDayOfMonth: 15, emiAmount: 73665, emisPaid: 10, remainingEmis: 37, emiEndDate: '2029-03-15', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'GJ16AY2046', make: 'TATA', model: '4825', year: 2020, owner: 'Kishan Enterprise', financier: 'TATA MOTORS FIN', loanTenure: 47, emiStartDate: '2025-04-15', emiDayOfMonth: 15, emiAmount: 73665, emisPaid: 10, remainingEmis: 37, emiEndDate: '2029-03-15', debitedAccount: 'Kishan Enterprise ICICI' },
  // --- ASHOK LEY ---
  { truckNo: 'GJ16AY3638', make: 'ASHOK LEY', model: '5525', year: 2019, owner: 'Kishan Enterprise', financier: 'YESBANK', loanTenure: 47, emiStartDate: '2025-08-22', emiDayOfMonth: 22, emiAmount: 67285, emisPaid: 6, remainingEmis: 41, emiEndDate: '2029-07-22', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'GJ16AY3815', make: 'ASHOK LEY', model: '5525', year: 2019, owner: 'Kishan Enterprise', financier: 'YESBANK', loanTenure: 47, emiStartDate: '2025-08-22', emiDayOfMonth: 22, emiAmount: 67285, emisPaid: 6, remainingEmis: 41, emiEndDate: '2029-07-22', debitedAccount: 'Kishan Enterprise ICICI' },
  // --- Heavy Equipment ---
  { truckNo: 'XCMG-EXCAVATOR', make: 'XCMG', model: 'EXCAVATOR', year: 0, owner: 'Kishan Enterprise', financier: 'HDFC BANK LTD', loanTenure: 47, emiStartDate: '2024-02-10', emiDayOfMonth: 10, emiAmount: 121860, emisPaid: 24, remainingEmis: 23, emiEndDate: '2028-01-10', debitedAccount: 'Kishan Enterprise ICICI', loanCategory: 'Equipment' },
  { truckNo: 'VOLVO-EXCAVATOR', make: 'VOLVO', model: 'EXCAVATOR', year: 0, owner: 'Kishan Enterprise', financier: 'HDFC BANK LTD', loanTenure: 47, emiStartDate: '2024-02-10', emiDayOfMonth: 10, emiAmount: 142382, emisPaid: 24, remainingEmis: 23, emiEndDate: '2028-01-10', debitedAccount: 'Kishan Enterprise ICICI', loanCategory: 'Equipment' },
  // --- Bharat Benz 5528T (New) ---
  { truckNo: 'GJ16AY3723', make: 'Bharat Benz', model: '5528T', year: 2023, owner: 'Kishan Enterprise', financier: 'ICICI BANK', loanTenure: 48, emiStartDate: '2025-08-15', emiDayOfMonth: 15, emiAmount: 37037, emisPaid: 6, remainingEmis: 42, emiEndDate: '2029-08-15', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'GJ16AY9837', make: 'Bharat Benz', model: '5528T', year: 2023, owner: 'Kishan Enterprise', financier: 'ICICI BANK', loanTenure: 48, emiStartDate: '2025-08-15', emiDayOfMonth: 15, emiAmount: 37037, emisPaid: 6, remainingEmis: 42, emiEndDate: '2029-08-15', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'GJ16AY3686', make: 'Bharat Benz', model: '5528T', year: 2023, owner: 'Kishan Enterprise', financier: 'ICICI BANK', loanTenure: 48, emiStartDate: '2025-08-15', emiDayOfMonth: 15, emiAmount: 65797, emisPaid: 6, remainingEmis: 42, emiEndDate: '2029-08-15', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'GJ16AY3758', make: 'Bharat Benz', model: '5528T', year: 2023, owner: 'Kishan Enterprise', financier: 'ICICI BANK', loanTenure: 48, emiStartDate: '2025-08-15', emiDayOfMonth: 15, emiAmount: 65796, emisPaid: 6, remainingEmis: 42, emiEndDate: '2029-08-15', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'GJ16AY8987', make: 'Bharat Benz', model: '5528T', year: 2023, owner: 'Kishan Enterprise', financier: 'ICICI BANK', loanTenure: 48, emiStartDate: '2025-08-15', emiDayOfMonth: 15, emiAmount: 65796, emisPaid: 6, remainingEmis: 42, emiEndDate: '2029-08-15', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'GJ16AY4184', make: 'Bharat Benz', model: '5528T', year: 2023, owner: 'Kishan Enterprise', financier: 'ICICI BANK', loanTenure: 48, emiStartDate: '2025-08-15', emiDayOfMonth: 15, emiAmount: 65796, emisPaid: 6, remainingEmis: 42, emiEndDate: '2029-08-15', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'GJ16AY8986', make: 'Bharat Benz', model: '5528T', year: 2023, owner: 'Kishan Enterprise', financier: 'ICICI BANK', loanTenure: 48, emiStartDate: '2025-08-15', emiDayOfMonth: 15, emiAmount: 65796, emisPaid: 6, remainingEmis: 42, emiEndDate: '2029-08-15', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'GJ16AY3630', make: 'Bharat Benz', model: '5528T', year: 2023, owner: 'Kishan Enterprise', financier: 'ICICI BANK', loanTenure: 48, emiStartDate: '2025-08-15', emiDayOfMonth: 15, emiAmount: 65796, emisPaid: 6, remainingEmis: 42, emiEndDate: '2029-08-15', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'GJ16AY8441', make: 'Bharat Benz', model: '5528T', year: 2023, owner: 'Kishan Enterprise', financier: 'ICICI BANK', loanTenure: 48, emiStartDate: '2025-08-15', emiDayOfMonth: 15, emiAmount: 65796, emisPaid: 6, remainingEmis: 42, emiEndDate: '2029-08-15', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'GJ16AY3918', make: 'Bharat Benz', model: '5528T', year: 2023, owner: 'Kishan Enterprise', financier: 'ICICI BANK', loanTenure: 48, emiStartDate: '2025-08-15', emiDayOfMonth: 15, emiAmount: 65796, emisPaid: 6, remainingEmis: 42, emiEndDate: '2029-08-15', debitedAccount: 'Kishan Enterprise ICICI' },
  // --- New Ashok Layland DD01AG (ICICI) ---
  { truckNo: 'DD01AG9033-T', make: 'Ashok Layland', model: 'TROLLEY', year: 2026, owner: 'Kishan Enterprise', financier: 'ICICI BANK', loanTenure: 60, emiStartDate: '2026-02-20', emiDayOfMonth: 20, emiAmount: 7493, emisPaid: 1, remainingEmis: 59, emiEndDate: '2031-02-20', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'DD01AG9033', make: 'Ashok Layland', model: '4620', year: 2026, owner: 'Kishan Enterprise', financier: 'ICICI BANK', loanTenure: 60, emiStartDate: '2026-02-20', emiDayOfMonth: 20, emiAmount: 58300, emisPaid: 1, remainingEmis: 59, emiEndDate: '2031-02-20', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'DD01AG9714-T', make: 'Ashok Layland', model: 'TROLLEY', year: 2026, owner: 'Kishan Enterprise', financier: 'ICICI BANK', loanTenure: 60, emiStartDate: '2026-02-20', emiDayOfMonth: 20, emiAmount: 7493, emisPaid: 1, remainingEmis: 59, emiEndDate: '2031-02-20', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'DD01AG9714', make: 'Ashok Layland', model: '4620', year: 2026, owner: 'Kishan Enterprise', financier: 'ICICI BANK', loanTenure: 60, emiStartDate: '2026-02-20', emiDayOfMonth: 20, emiAmount: 58300, emisPaid: 1, remainingEmis: 59, emiEndDate: '2031-02-20', debitedAccount: 'Kishan Enterprise ICICI' },
  // --- New Ashok Layland DD01AG (YESBANK) ---
  { truckNo: 'DD01AG9129', make: 'Ashok Layland', model: '4620', year: 2026, owner: 'Kishan Enterprise', financier: 'YESBANK', loanTenure: 60, emiStartDate: '2026-02-22', emiDayOfMonth: 22, emiAmount: 68067, emisPaid: 1, remainingEmis: 59, emiEndDate: '2031-02-22', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'DD01AG9129-T', make: 'Ashok Layland', model: 'TROLLEY', year: 2026, owner: 'Kishan Enterprise', financier: 'YESBANK', loanTenure: 60, emiStartDate: '2026-02-22', emiDayOfMonth: 22, emiAmount: 7444, emisPaid: 1, remainingEmis: 59, emiEndDate: '2031-02-22', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'DD01AG9567-T', make: 'Ashok Layland', model: 'TROLLEY', year: 2026, owner: 'Kishan Enterprise', financier: 'YESBANK', loanTenure: 60, emiStartDate: '2026-02-22', emiDayOfMonth: 22, emiAmount: 7444, emisPaid: 1, remainingEmis: 59, emiEndDate: '2031-02-22', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'DD01AG9741-T', make: 'Ashok Layland', model: 'TROLLEY', year: 2026, owner: 'Kishan Enterprise', financier: 'YESBANK', loanTenure: 60, emiStartDate: '2026-02-22', emiDayOfMonth: 22, emiAmount: 7444, emisPaid: 1, remainingEmis: 59, emiEndDate: '2031-02-22', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'DD01AG9741', make: 'Ashok Layland', model: '4620', year: 2026, owner: 'Kishan Enterprise', financier: 'YESBANK', loanTenure: 60, emiStartDate: '2026-02-22', emiDayOfMonth: 22, emiAmount: 68067, emisPaid: 1, remainingEmis: 59, emiEndDate: '2031-02-22', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'DD01AG9567', make: 'Ashok Layland', model: '4620', year: 2026, owner: 'Kishan Enterprise', financier: 'YESBANK', loanTenure: 60, emiStartDate: '2026-02-22', emiDayOfMonth: 22, emiAmount: 68067, emisPaid: 1, remainingEmis: 59, emiEndDate: '2031-02-22', debitedAccount: 'Kishan Enterprise ICICI' },
  // --- New Ashok Layland DD01AG (HINDUJA) ---
  { truckNo: 'DD01AG9362', make: 'Ashok Layland', model: '4620', year: 2026, owner: 'Kishan Enterprise', financier: 'HINDUJA', loanTenure: 60, emiStartDate: '2026-03-05', emiDayOfMonth: 5, emiAmount: 76758, emisPaid: 1, remainingEmis: 59, emiEndDate: '2031-03-05', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'DD01AG9141', make: 'Ashok Layland', model: '4620', year: 2026, owner: 'Kishan Enterprise', financier: 'HINDUJA', loanTenure: 60, emiStartDate: '2026-03-05', emiDayOfMonth: 5, emiAmount: 76758, emisPaid: 1, remainingEmis: 59, emiEndDate: '2031-03-05', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'DD01AG9523', make: 'Ashok Layland', model: '4620', year: 2026, owner: 'Kishan Enterprise', financier: 'HINDUJA', loanTenure: 60, emiStartDate: '2026-03-05', emiDayOfMonth: 5, emiAmount: 76758, emisPaid: 1, remainingEmis: 59, emiEndDate: '2031-03-05', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'DD01AG9259', make: 'Ashok Layland', model: '4620', year: 2026, owner: 'Kishan Enterprise', financier: 'HINDUJA', loanTenure: 60, emiStartDate: '2026-03-05', emiDayOfMonth: 5, emiAmount: 76758, emisPaid: 1, remainingEmis: 59, emiEndDate: '2031-03-05', debitedAccount: 'Kishan Enterprise ICICI' },
  { truckNo: 'DD01AG9708', make: 'Ashok Layland', model: '4620', year: 2026, owner: 'Kishan Enterprise', financier: 'HINDUJA', loanTenure: 60, emiStartDate: '2026-03-05', emiDayOfMonth: 5, emiAmount: 76758, emisPaid: 1, remainingEmis: 59, emiEndDate: '2031-03-05', debitedAccount: 'Kishan Enterprise ICICI' },
  // --- Non-vehicle loans ---
  { truckNo: 'FLAT-LOAN-IDFC', make: 'OFFICE LOAN', model: 'Flat Loan', year: 2021, owner: 'Kishan Enterprise', financier: 'IDFC BANK', loanTenure: 180, emiStartDate: '2021-03-02', emiDayOfMonth: 2, emiAmount: 41167, emisPaid: 59, remainingEmis: 121, emiEndDate: '2036-03-02', debitedAccount: 'Kishan Enterprise ICICI', loanCategory: 'Office Loan' },
  { truckNo: 'MASS-FINANCE', make: 'MASS FINANCE', model: 'Mass Finance', year: 2023, owner: 'Kishan Enterprise', financier: 'MASS FIN', loanTenure: 36, emiStartDate: '2023-11-08', emiDayOfMonth: 8, emiAmount: 106213, emisPaid: 27, remainingEmis: 9, emiEndDate: '2026-11-08', debitedAccount: 'Kishan Enterprise ICICI', loanCategory: 'Finance' },
  { truckNo: 'MSME-AXIS', make: 'AXIS', model: 'MSME Loan', year: 2022, owner: 'Kishan Enterprise', financier: 'AXIS BANK', loanTenure: 60, emiStartDate: '2022-01-20', emiDayOfMonth: 20, emiAmount: 24575, emisPaid: 49, remainingEmis: 11, emiEndDate: '2027-01-20', debitedAccount: 'Kishan Enterprise ICICI', loanCategory: 'MSME' },
  { truckNo: 'HOUSE-LOAN-HDB', make: 'FLATE LOAN', model: 'House Loan', year: 2022, owner: 'Kishan Enterprise', financier: 'HDB FINANCE', loanTenure: 142, emiStartDate: '2022-05-04', emiDayOfMonth: 4, emiAmount: 74736, emisPaid: 45, remainingEmis: 97, emiEndDate: '2034-03-04', debitedAccount: 'Kishan Enterprise ICICI', loanCategory: 'House Loan' },
];

// Map debitedAccount → entity name used in transactions/Firestore
export const ACCOUNT_TO_ENTITY: Record<string, string> = {
  'Kishan Enterprise ICICI': 'Kishan Enterprise | ICICI',
};

// Get upcoming EMI dates in the next N days from a reference date
export function getUpcomingEMIs(loans: EMILoan[], fromDate: Date, days: number) {
  const result: { date: Date; loans: EMILoan[]; totalAmount: number; daysFromNow: number }[] = [];
  const seen = new Set<string>();

  for (let i = 0; i <= days; i++) {
    const checkDate = new Date(fromDate);
    checkDate.setDate(fromDate.getDate() + i);
    const dayOfMonth = checkDate.getDate();
    const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${dayOfMonth}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const due = loans.filter(l => l.emiDayOfMonth === dayOfMonth && l.remainingEmis > 0);
    if (due.length > 0) {
      const totalAmount = due.reduce((sum, l) => sum + l.emiAmount, 0);
      result.push({ date: checkDate, loans: due, totalAmount, daysFromNow: i });
    }
  }
  return result;
}
