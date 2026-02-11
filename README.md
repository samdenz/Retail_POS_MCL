# Retail_POS_MCL
A POS system for a retail business
1. Project Overview

This is a desktop-based Point of Sale (POS) system designed for a small retail bookshop.
The system supports offline operation, inventory management, sales processing, and receipt printing.

The application is built using Electron, Node.js, and MySQL, making it suitable for real-world retail use.

2. Objectives

Provide a fast and reliable POS system for daily bookshop operations

Reduce manual record keeping

Accurately track inventory and sales

Generate receipts and sales reports

Support role-based access (admin and cashier)

3. Scope (MVP – Minimum Viable Product)

This MVP focuses on core retail functionality only.
Advanced features will be added in later versions.

4. MVP Features
4.1 User Management

User login and logout

Role-based access:

Admin

Manage users

Add/edit books

View reports

Cashier

Make sales

View own sales

4.2 Inventory Management

Add new books

Update book details

View current stock levels

Automatic stock deduction after each sale

Low-stock warning (basic)

4.3 Sales Module

Search books by:

Title

ISBN

Add books to cart

Adjust quantities

Calculate total cost

Accept payment methods:

Cash

M-Pesa

Card

Complete sale transaction

4.4 Receipt Generation

Generate a receipt after each sale

Support:

Thermal printer

PDF fallback

Receipt includes:

Shop name

Date & time

Items purchased

Total amount

Payment method

4.5 Reports

Daily sales report

Total sales amount

Number of transactions

Best-selling books (basic)

5. Out of Scope (Not in MVP)

The following features are intentionally excluded from the MVP:

Online/cloud syncing

Multi-branch support

Customer accounts

Loyalty programs

Refunds & returns

Advanced analytics

Mobile application

6. Technology Stack
Desktop Framework

Electron

Backend

Node.js

Express.js

Database

MySQL (local installation)

Frontend

HTML

CSS

JavaScript

Security

Password hashing (bcrypt)

Role-based access control

7. System Architecture (High-Level)
Electron Desktop App
        |
        v
Frontend UI (Renderer Process)
        |
        v
Express Backend (Local Server)
        |
        v
MySQL Database (Local)

8. User Flow (MVP)

User launches POS application

User logs in

Cashier:

Searches books

Adds to cart

Completes sale

Prints receipt

Admin:

Manages inventory

Views sales reports

System updates stock automatically

9. Development Phases
Phase 1 – Core Setup

Database schema

Backend server

Authentication

Phase 2 – Core POS Logic

Inventory management

Sales transactions

Phase 3 – Desktop UI

Electron integration

POS screens

Phase 4 – Testing & Deployment

Printer testing

Error handling

Packaging into installer

10. Success Criteria

The MVP will be considered complete when:

A cashier can make a sale from login to receipt printing

Stock updates correctly after sales

Admin can view daily sales reports

The system works fully offline

11. Future Enhancements

M-Pesa API integration

Cloud backup

Refunds & returns

Barcode scanner support

Multi-user concurrency improvements