# TrafficDesk — Traffic Challan Management System

TrafficDesk is a local Node.js and MySQL application for issuing, tracking, and paying traffic challans. It has separate police, vehicle-owner, and administrator experiences.

## Features

- Police registration and login using a project Police ID format such as `TS-POL-1234`
- Password hashing with Node.js `crypto.scrypt`
- Police-only challan generation with an auditable issuing officer and timestamp
- Multiple violations can be selected for one vehicle in a single action; each becomes a separate challan record
- Vehicle-number normalization and validation (for example `TS 09 AB 1234` becomes `TS09AB1234`)
- Public vehicle lookup and payment-status update
- Administrator dashboard with total officers, vehicles, challans, pending payments, and collected fines
- Searchable challan history plus police-officer and vehicle records

## Run locally

1. Ensure MySQL is running and configure your local database credentials in `.env`.
2. In the project folder, install packages:

   ```bash
   npm ci
