Helthjem developer
Guide
API reference

Open SearchSearch
Keyboard Shortcut:CTRL⌃ k
















































v1.0.3
OAS 3.1.0
Helthjem Developer

Download OpenAPI Document

Download OpenAPI Document
This Helthjem API is organised around REST. Our API has predictable resource-oriented URLs, accepts form-encoded request bodies, returns JSON-encoded responses, and uses standard HTTP response codes, authentication and verbs.

You can use the Helthjem API in test mode, called pre-prod, which doesn't affect live bookings. The credentials you use to authenticate in test and production will be different, speak with our integration team to aquire these.

The API doesn't support bulk updates. You can work on only one object per request.

Server
Server:
https://api.pre.helthjem.no
Testing/Pre-Production Environment


Authentication
Required
Selected Auth Type:bearerAuth
JWT Bearer token obtained from the /auth/oauth/v1/token endpoint.
More
Bearer Token
:
Token
Show Password
Client Libraries
Shell Curl
AUTHENTICATION ​Copy link
The Helthjem API uses a Bearer JWT to authenticate requests.

Your credentials carry many privileges, so be sure to keep them secure! Do not share your credentials in publicly accessible areas such as GitHub, client-side code, and so forth.

AUTHENTICATIONOperations
post
/auth/oauth2/v1/token
Get Authorization token​Copy link
Retrieves a JWT for authentication.

Uses client_id and client_secret and returns a token.

The token should be used in subsequent API requests. The expires_in field denotes the number of seconds the token will remain valid.

Body
required
application/json
Request body for obtaining an authorization token.

client_idCopy link to client_id
Type:string
required
Example
Unique identifier for the client application.

client_secretCopy link to client_secret
Type:string
required
Example
Secret key for the client application.

grant_typeCopy link to grant_type
Type:string
required
Example
Must be 'client_credentials' for this flow.

Responses

200
Successfully obtained JWT token.

Type:object
Response containing the access token and metadata.

expires_in
Type:integer
required
Example
Lifetime of the token in seconds.

token
Type:string
required
Example
The JWT Bearer token used for authorization.

token_type
Type:string
required
Example
Type of the token, always 'Bearer'.

application/json

400
Invalid request data, such as missing required fields or invalid format.

Type:object
Example
Standard error response structure.

code
Type:integer
required
Example
HTTP status code or a custom error code.

message
Type:string
required
Example
A detailed, human-readable description of the error.

application/json
401Copy link to 401
Authorization failed - Invalid credentials provided.

Request Example forpost/auth/oauth2/v1/token
Shell Curl

curl https://api.pre.helthjem.no/auth/oauth2/v1/token \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN' \
  --data '{
  "client_id": "xxx",
  "client_secret": "xxx",
  "grant_type": "client_credentials"
}'

Test Request
(post /auth/oauth2/v1/token)
Status:200
Status:400
Status:401


{
  "token": "xxx",
  "expires_in": 86400,
  "token_type": "Bearer"
}
Successfully obtained JWT token.

CHECKOUT ​Copy link
Operations related to coverage validation and finding service points during the checkout process.

CHECKOUTOperations
post
/parcels/v1/addresses/find/single
post
/parcels/v1/service-points/nearby
Single Address Check​Copy link
Returns a confirmation of coverage for a given address and Transport Solution.

Read guide Check coverage

Body
required
application/json
Request body to check delivery coverage for a single address.

addressCopy link to address
Type:string
required
Example
Combined address information; Street name, street number, Entrance, Apartment number.

countryCodeCopy link to countryCode
Type:string
required
Example
Two-letter country code (ISO 3166-1).

postalNameCopy link to postalName
Type:string
required
Example
City name.

shopIdCopy link to shopId
Type:integer
required
Example
The identifier of the shop that makes the request.

transportSolutionIdCopy link to transportSolutionId
Type:integer
required
Example
Transport Solution ID.

zipCodeCopy link to zipCode
Type:string
required
Example
Also known as postal code.

customer nameCopy link to customer name
Type:string
Example
The full name of the recipient.

weightCopy link to weight
Type:integer
Example
Parcel weight in grams

Responses

200
Single Address Check successful.

Type:object
Response indicating address coverage, available delivery options, and routing details.

companyId
Type:integer
Example
The ID of the company handling the route (e.g., 1 for Helthjem).

handoverCity
Type:string
Example
City of the handover location.

handoverDescription
Type:string
Example
Description of the handover location.

handoverId
Type:integer
Example
Identifier for the handover location.

handoverStreetName
Type:string
Example
Street name of the handover location.

handoverStreetNumber
Type:integer
Example
Street number of the handover location.

handoverZipCode
Type:string
Example
Zip code of the handover location.

plannedDeparture
Type:string
Example
The planned departure time (HHMM).

productName
Type:string
Example
Name of the determined freight product.

routeAddress
Type:string
Example
The main address associated with the determined route.

routeDescription
Type:string
Example
Descriptive name of the route center/hub.

routeName
Type:string
Example
Internal route identifier.

routing
Type:string
Example
Internal routing string.

routingCode
Type:string
Example
Simple routing code.

routingDescription
Type:string
Example
Description of the routing.

application/json

400
Invalid request data, such as missing required fields or invalid format.

Type:object
Standard error response structure.

code
Type:integer
required
Example
HTTP status code or a custom error code.

message
Type:string
required
Example
A detailed, human-readable description of the error.

application/json
Request Example forpost/parcels/v1/addresses/find/single
Shell Curl

curl https://api.pre.helthjem.no/parcels/v1/addresses/find/single \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN' \
  --data '{
  "shopId": 1,
  "transportSolutionId": 1,
  "customer name": "Test Customer",
  "address": "Vøyensvingen 10 H0202",
  "zipCode": "0457",
  "postalName": "Oslo",
  "countryCode": "NO",
  "weight": 1000
}'

Test Request
(post /parcels/v1/addresses/find/single)
Status:200
Status:400

{
  "productName": "HELTHJEM",
  "routeName": "21516",
  "companyId": 1,
  "routing": "1-31/114-43-x21516x385",
  "routingCode": "1",
  "routeAddress": "TÅSENVEIEN 26",
  "routeDescription": "BUDSENTRAL TÅSEN 1",
  "handoverId": 3223047,
  "handoverCity": "OSLO",
  "handoverZipCode": "484",
  "handoverStreetName": "SANDAKERVEIEN",
  "handoverStreetNumber": 121,
  "handoverDescription": "MNO TRYKK NYDALEN",
  "routingDescription": "DROPP 1 TÅSEN",
  "plannedDeparture": "1600"
}
Single Address Check successful.

Nearby Service Points​Copy link
Returns 3 available service-points nearby a specified address, depending on Transport Solution.

Read Nearby Service Points guide

Body
required
application/json
Request body to find 3 nearby service points.

countryCodeCopy link to countryCode
Type:string
required
Example
Two-letter country code (ISO 3166-1).

shopIdCopy link to shopId
Type:integer
required
Example
The identifier of the shop that makes the request.

transportSolutionIdCopy link to transportSolutionId
Type:integer
required
Example
Transport Solution ID.

zipCodeCopy link to zipCode
Type:string
required
Example
Also known as postal code.

postalNameCopy link to postalName
Type:string
Example
City name.

streetAddressCopy link to streetAddress
Type:string
Example
Combined address information; Street name, street number, Entrance, Apartment number.

Responses

200
List of service points returned successfully, grouped by freight product.

Type:object
The root response containing a list of freight products and their associated service points.

freightProducts
Type:array object[]
required
List of freight products available, each containing service points.

Service points grouped under a specific freight product.

Show Child Attributesfor freightProducts
application/json

400
Invalid request data, such as missing required fields or invalid format.

Type:object
Standard error response structure.

code
Type:integer
required
Example
HTTP status code or a custom error code.

message
Type:string
required
Example
A detailed, human-readable description of the error.

application/json
Request Example forpost/parcels/v1/service-points/nearby
Shell Curl

curl https://api.pre.helthjem.no/parcels/v1/service-points/nearby \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN' \
  --data '{
  "shopId": 1,
  "transportSolutionId": 62,
  "streetAddress": "Storgaten 11A H0202",
  "zipCode": "0155",
  "postalName": "Oslo",
  "countryCode": "NO"
}'

Test Request
(post /parcels/v1/service-points/nearby)
Status:200
Status:400

{
  "freightProducts": [
    {
      "transporterId": 62,
      "transporterName": "Helthjem AS",
      "freightProductId": 55,
      "freightName": "Helthjem Hentepakke",
      "freightTitle": "Hentepakke",
      "freightDescription": "Utlevering av pakke i Helthjem butikk.",
      "servicePoints": [
        {
          "servicePointExternalId": "30694",
          "servicePointName": "Joker Toftes Gate",
          "openingHours": [
            {
              "from1": "07:00",
              "to1": "00:00",
              "day": "MONDAY"
            }
          ],
          "visitingAddress": {
            "postalCode": "0556",
            "countryCode": "NO",
            "streetNumber": "12",
            "streetName": "TOFTES GATE",
            "postalName": "OSLO"
          },
          "deliveryAddress": {
            "postalCode": "0556",
            "countryCode": "NO",
            "streetNumber": "12",
            "streetName": "TOFTES GATE",
            "postalName": "OSLO"
          },
          "routingCode": null,
          "eligibleParcelOutlet": true,
          "servicePointCoordinates": [
            {
              "northing": 59.92947006225586,
              "easting": 10.761232376098633
            }
          ]
        }
      ],
      "properties": {}
    }
  ]
}
List of service points returned successfully, grouped by freight product.

BOOKING ​Copy link
Operations related to Registration and creation of new parcel shipments.

BOOKINGOperations
post
/parcels/v1/bookings
Book a parcel​Copy link
Create a new booking for a parcel. Responds with a shipment ID that can be used to generate a label and track the parcel events.

Read Book a parcel guide

Body
required
application/json
Request body for registering a new parcel shipment.

itemsCopy link to items
Type:array object[]
required
List of parcel items being shipped.

Details about the physical item being shipped.

Show Child Attributesfor items
partiesCopy link to parties
Type:array object[]
2…3
required
Consignee and Consignor. Must contain atleast two Party objects.

Consignee (recipient) or Consignor (sender) details.

Show Child Attributesfor parties
shipmentIdCopy link to shipmentId
Type:string
required
A unique identifier for the shipment (e.g., customer order ID).

shopIdCopy link to shopId
Type:integer
required
Example
The identifier of the shop making the booking.

transportSolutionIdCopy link to transportSolutionId
Type:integer
required
Example
The chosen transport solution ID.

Responses

201
Shipment registered successfully.

Type:object
Response after a successful booking.

order_id
Type:string
required
Example
The unique Helthjem order identifier.

tracking_identifier
Type:string
required
Example
The identifier used for tracking the shipment.

application/json

400
Invalid request data, such as missing required fields or invalid format.

Type:object
Standard error response structure.

code
Type:integer
required
Example
HTTP status code or a custom error code.

message
Type:string
required
Example
A detailed, human-readable description of the error.

application/json
403Copy link to 403
Forbidden.

Request Example forpost/parcels/v1/bookings
Shell Curl

curl https://api.pre.helthjem.no/parcels/v1/bookings \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN' \
  --data '{
  "shopId": 1,
  "transportSolutionId": 2,
  "shipmentId": "",
  "parties": [
    {
      "type": "consignee",
      "name": "Ola Nordmann",
      "countryCode": "NO",
      "postalName": "Oslo",
      "zipCode": "0161",
      "address": "Storgata 15A H0202",
      "phone1": "12345678",
      "email": "test@gmail.com",
      "reference": "cust_ref",
      "contact": "contact2"
    },
    {
      "type": "consignor",
      "id": null,
      "name": "Test shop",
      "countryCode": "NO",
      "postalName": "Vestby",
      "zipCode": "1540",
      "address": "Toveien 19",
      "phone1": "12345678",
      "phone2": null,
      "email": "test@gmail.com",
      "reference": "shop_ref",
      "contact": "contact1",
      "coaddress": null
    }
  ],
  "items": [
    {
      "itemNumber": 1,
      "trackingReference": "",
      "weight": 1000,
      "width": 12,
      "height": 12,
      "length": 12,
      "contents": "test item"
    }
  ]
}'

Test Request
(post /parcels/v1/bookings)
Status:201
Status:400
Status:403

{
  "order_id": "HH-20250101-12345",
  "tracking_identifier": "HJT123456789"
}
Shipment registered successfully.

LABELS ​Copy link
Generate printable shipping labels.

LABELSOperations
get
/parcels/v1/labels/{identifier}/{labelType}
Generate a label​Copy link
Generates a printable shipping label in the requested format (PDF, PNG, SVG, or ZPL) based on a registered order identifier. The identifier can be either a trackingReference or shipmentId.

Path Parameters
identifierCopy link to identifier
Type:string
required
Example
Can be either a trackingReference or a shipmentId.

labelTypeCopy link to labelType
enum
const:  
unified-large
required
Example
What kind of label is requested. Determines both layout and size.

unified-large
Headers
AcceptCopy link to Accept
Type:string
enum
Example
Accepted response content type. Can include file types or 'application/json' for error messages.

application/pdf
image/png
image/svg+xml
application/zpl
application/json
Responses

200
Shipping label generated successfully (file response).

Type:string
Format:binary
binary data, used to describe files

Selected Content Type:
application/pdf

400
Invalid request data, such as missing required fields or invalid format.

Type:object
Standard error response structure.

code
Type:integer
required
Example
HTTP status code or a custom error code.

message
Type:string
required
Example
A detailed, human-readable description of the error.

application/json

401
Authentication Failure.

Type:object
Standard error response structure.

code
Type:integer
required
Example
HTTP status code or a custom error code.

message
Type:string
required
Example
A detailed, human-readable description of the error.

application/json

403
Access Denied. The client is not authorized for this shop/shipment.

Type:object
Standard error response structure.

code
Type:integer
required
Example
HTTP status code or a custom error code.

message
Type:string
required
Example
A detailed, human-readable description of the error.

application/json

404
The requested resource (e.g., shipment or address) could not be found.

Type:object
Standard error response structure.

code
Type:integer
required
Example
HTTP status code or a custom error code.

message
Type:string
required
Example
A detailed, human-readable description of the error.

application/json
Request Example forget/parcels/v1/labels/{identifier}/{labelType}
Shell Curl

curl https://api.pre.helthjem.no/parcels/v1/labels/(401)70724763243779244/unified-large \
  --header 'Accept: application/pdf' \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN'

Test Request
(get /parcels/v1/labels/{identifier}/{labelType})
Status:200
Status:400
Status:401
Status:403
Status:404


{}
Shipping label generated successfully (file response).

TRACKING ​Copy link
Monitoring shipment status and fetching event history.

TRACKINGOperations
get
/parcels/v1/tracking/fetch/{identifier}/NO/false
Fetch tracking events​Copy link
Retrieves the complete history of tracking events for a given identifier, which can be a shipment number, tracking reference, or return code.

Path Parameters
identifierCopy link to identifier
Type:string
required
Example
The unique shipment or tracking identifier.

Responses

200
Tracking information retrieved successfully.

Type:array object[]
The root object for a single shipment's tracking details.

items
Type:array object[]
required
List of items (parcels) within the shipment.

Details and events for a single parcel/item within a shipment.

Show Child Attributesfor items
shipmentNumber
Type:string
required
Example
The main identifier for the shipment.

shopId
Type:integer
required
Example
ID of the shop.

consigneeReference
Type:string
Example
Customer reference associated with the recipient (consignee).

consignorReference
Type:string
Example
Shop reference associated with the sender (consignor).

properties
Type:object
Example
Additional shipment properties.

shopName
Type:string
Example
Name of the shop associated with the shipment.

application/json

400
Invalid request data, such as missing required fields or invalid format.

Type:object
Standard error response structure.

code
Type:integer
required
Example
HTTP status code or a custom error code.

message
Type:string
required
Example
A detailed, human-readable description of the error.

application/json

404
The requested resource (e.g., shipment or address) could not be found.

Type:object
Standard error response structure.

code
Type:integer
required
Example
HTTP status code or a custom error code.

message
Type:string
required
Example
A detailed, human-readable description of the error.

application/json
Request Example forget/parcels/v1/tracking/fetch/{identifier}/NO/false
Shell Curl

curl https://api.pre.helthjem.no/parcels/v1/tracking/fetch/70724763243779244/NO/false \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN'

Test Request
(get /parcels/v1/tracking/fetch/{identifier}/NO/false)
Status:200
Status:400
Status:404

[
  {
    "shipmentNumber": "70724763243779244",
    "shopName": "Testbutikken",
    "shopId": 1,
    "consigneeReference": "cust_ref",
    "consignorReference": "shop_ref",
    "properties": {},
    "items": [
      {
        "trackingNumber": "370724763243779252",
        "returnCode": null,
        "freightProductId": 1,
        "freightProductName": "helthjem",
        "parcelStatus": "WAITING_FOR_PACKAGE",
        "linkedParcelNumbers": [],
        "events": [
          {
            "eventTime": "2025-10-13 13:50:03",
            "eventTimeUtc": "2025-10-13T11:50:03.390000Z",
            "lat": null,
            "lon": null,
            "locationContext": "Testbutikken",
            "locationContextId": null,
            "eventType": {
              "apiKey": "007",
              "description": "Address collector sendt til mottaker",
              "i18nKey": "event.type.distr.requested.consignee.addresscollect"
            },
            "additionalInfo": null,
            "eventGroup": {
              "id": 3,
              "name": "event.type.group.communication"
            },
            "comChannelType": null,
            "...": "[Additional Properties Truncated]"
          }
        ]
      }
    ]
  }
]
Tracking information retrieved successfully.

Models

ErrorResponse​Copy link
Standard error response structure.

code
Type:integer
required
Example
HTTP status code or a custom error code.

message
Type:string
required
Example
A detailed, human-readable description of the error.


TokenRequest​Copy link
Request body for obtaining an authorization token.

client_id
Type:string
required
Example
Unique identifier for the client application.

client_secret
Type:string
required
Example
Secret key for the client application.

grant_type
Type:string
required
Example
Must be 'client_credentials' for this flow.


TokenResponse​Copy link
Response containing the access token and metadata.

expires_in
Type:integer
required
Example
Lifetime of the token in seconds.

token
Type:string
required
Example
The JWT Bearer token used for authorization.

token_type
Type:string
required
Example
Type of the token, always 'Bearer'.


SingleAddressCheckRequest​Copy link
Request body to check delivery coverage for a single address.

address
Type:string
required
Example
Combined address information; Street name, street number, Entrance, Apartment number.

countryCode
Type:string
required
Example
Two-letter country code (ISO 3166-1).

postalName
Type:string
required
Example
City name.

shopId
Type:integer
required
Example
The identifier of the shop that makes the request.

transportSolutionId
Type:integer
required
Example
Transport Solution ID.

zipCode
Type:string
required
Example
Also known as postal code.

customer name
Type:string
Example
The full name of the recipient.

weight
Type:integer
Example
Parcel weight in grams


SingleAddressCheckResponse​Copy link
Response indicating address coverage, available delivery options, and routing details.

companyId
Type:integer
Example
The ID of the company handling the route (e.g., 1 for Helthjem).

handoverCity
Type:string
Example
City of the handover location.

handoverDescription
Type:string
Example
Description of the handover location.

handoverId
Type:integer
Example
Identifier for the handover location.

handoverStreetName
Type:string
Example
Street name of the handover location.

handoverStreetNumber
Type:integer
Example
Street number of the handover location.

handoverZipCode
Type:string
Example
Zip code of the handover location.

plannedDeparture
Type:string
Example
The planned departure time (HHMM).

productName
Type:string
Example
Name of the determined freight product.

routeAddress
Type:string
Example
The main address associated with the determined route.

routeDescription
Type:string
Example
Descriptive name of the route center/hub.

routeName
Type:string
Example
Internal route identifier.

routing
Type:string
Example
Internal routing string.

routingCode
Type:string
Example
Simple routing code.

routingDescription
Type:string
Example
Description of the routing.


NearbyServicePointRequest​Copy link
Request body to find 3 nearby service points.

countryCode
Type:string
required
Example
Two-letter country code (ISO 3166-1).

shopId
Type:integer
required
Example
The identifier of the shop that makes the request.

transportSolutionId
Type:integer
required
Example
Transport Solution ID.

zipCode
Type:string
required
Example
Also known as postal code.

postalName
Type:string
Example
City name.

streetAddress
Type:string
Example
Combined address information; Street name, street number, Entrance, Apartment number.


AddressDetail​Copy link
Detailed address information for visiting or delivery.

countryCode
Type:string
required
Example
Two-letter country code (ISO 3166-1).

postalCode
Type:string
required
Example
Postal code.

postalName
Type:string
required
Example
City or postal name.

streetName
Type:string
required
Example
Street name (often capitalized).

streetNumber
Type:string
required
Example
Street number.


OpeningHour​Copy link
Opening hours for a single day.

day
Type:string
enum
required
Example
Day of the week.

MONDAY
TUESDAY
WEDNESDAY
THURSDAY
FRIDAY
SATURDAY
SUNDAY
from1
Type:string
required
Example
Opening time in HH:MM format.

to1
Type:string
required
Example
Closing time in HH:MM format.


Coordinate​Copy link
Geographic coordinates.

easting
Type:number
Format:double
required
Example
Longitude coordinate (easting).

northing
Type:number
Format:double
required
Example
Latitude coordinate (northing).


ServicePoint​Copy link
Detailed information for an individual nearby service point.

deliveryAddress
Type:object
required
Detailed address information for visiting or delivery.


deliveryAddress
eligibleParcelOutlet
Type:boolean
required
Example
Indicates if the location is eligible as a parcel drop-off/pickup point.

openingHours
Type:array object[]
required
List of daily opening hours.

Opening hours for a single day.


openingHours
servicePointCoordinates
Type:array object[]
required
Geographic coordinates of the service point.

Geographic coordinates.


servicePointCoordinates
servicePointExternalId
Type:string
required
Example
Unique external ID for the service point.

servicePointName
Type:string
required
Example
Name of the service point location.

visitingAddress
Type:object
required
Detailed address information for visiting or delivery.


visitingAddress
routingCode
Type:string
nullable
Internal routing code, may be null.


FreightProduct​Copy link
Service points grouped under a specific freight product.

freightProductId
Type:integer
required
Example
Unique ID of the freight product (e.g., Hentepakke).

servicePoints
Type:array object[]
required
List of service points available for this product.

Detailed information for an individual nearby service point.


servicePoints
transporterId
Type:integer
required
Example
ID of the transporter (e.g., Helthjem).

freightDescription
Type:string
Example
Description of the freight product service.

freightName
Type:string
Example
Full name of the freight product.

freightTitle
Type:string
Example
Short title of the freight product.

properties
Type:object
Example
Additional, often empty, properties for the freight product.

transporterName
Type:string
Example
Name of the transporter.


NearbyServicePointResponse​Copy link
The root response containing a list of freight products and their associated service points.

freightProducts
Type:array object[]
required
List of freight products available, each containing service points.

Service points grouped under a specific freight product.


freightProducts

Party​Copy link
Consignee (recipient) or Consignor (sender) details.

address
Type:string
required
Example
Street address, including street number and apartment/entrance.

contact
Type:string
required
Example
Internal contact identifier.

countryCode
Type:string
required
Example
Two-letter country code (ISO 3166-1).

email
Type:string
Format:email
required
Example
Email address for notification/contact.

name
Type:string
required
Example
Name of the party. Mandatory for consignee and consignor.

phone1
Type:string
required
Example
Primary phone number.

postalName
Type:string
required
Example
Also known as city.

reference
Type:string
max length:  
50
required
Example
Internal reference for this party.

type
Type:string
enum
required
Example
Role of the party in the shipment.

consignee
consignor
servicePoint
zipCode
Type:string
required
Example
Also known as postal code.

coaddress
Type:string
nullable
Care-of address, if applicable.

id
Type:integer
nullable
Example
Identifier that can be used to identify the same party between different shipments.

phone2
Type:string
nullable
Secondary phone number.


Item​Copy link
Details about the physical item being shipped.

itemNumber
Type:integer
required
Example
Sequence number for the item in the shipment.

trackingReference
Type:string
required
Optional external tracking reference for the item.

contents
Type:string
Example
Brief description of the contents for customs/declaration.

height
Type:number
Example
Item height in centimeters (cm).

length
Type:number
Example
Item length in centimeters (cm).

volume
Type:integer
Item volume in cubic decimeter.

weight
Type:integer
Example
Item weight in grams (g).

width
Type:number
Example
Item width in centimeters (cm).


BookingRequest​Copy link
Request body for registering a new parcel shipment.

items
Type:array object[]
required
List of parcel items being shipped.

Details about the physical item being shipped.


items
parties
Type:array object[]
2…3
required
Consignee and Consignor. Must contain atleast two Party objects.

Consignee (recipient) or Consignor (sender) details.


parties
shipmentId
Type:string
required
A unique identifier for the shipment (e.g., customer order ID).

shopId
Type:integer
required
Example
The identifier of the shop making the booking.

transportSolutionId
Type:integer
required
Example
The chosen transport solution ID.


BookingResponse​Copy link
Response after a successful booking.

order_id
Type:string
required
Example
The unique Helthjem order identifier.

tracking_identifier
Type:string
required
Example
The identifier used for tracking the shipment.


TrackingShipment​Copy link
The root object for a single shipment's tracking details.

items
Type:array object[]
required
List of items (parcels) within the shipment.

Details and events for a single parcel/item within a shipment.


items
shipmentNumber
Type:string
required
Example
The main identifier for the shipment.

shopId
Type:integer
required
Example
ID of the shop.

consigneeReference
Type:string
Example
Customer reference associated with the recipient (consignee).

consignorReference
Type:string
Example
Shop reference associated with the sender (consignor).

properties
Type:object
Example
Additional shipment properties.

shopName
Type:string
Example
Name of the shop associated with the shipment.


TrackingItem​Copy link
Details and events for a single parcel/item within a shipment.

events
Type:array object[]
required
Chronological list of detailed tracking events for this parcel.

Detailed single event record.


events
freightProductId
Type:integer
required
Example
ID of the freight product used.

parcelStatus
Type:string
required
Example
Current overall status of the parcel.

trackingNumber
Type:string
required
Example
Unique tracking number for the individual parcel.

freightProductName
Type:string
Example
Name of the freight product.

linkedParcelNumbers
Type:array string[]
Example
List of other linked parcel numbers.

returnCode
Type:string
nullable
Return code if the parcel is being returned.


DetailedTrackingEvent​Copy link
Detailed single event record.

eventGroup
Type:object
required
The grouping category for the event type.


eventGroup
eventTime
Type:string
required
Example
Local time the event occurred (YYYY-MM-DD HH:MM:SS).

eventType
Type:object
required
Details about the specific type of event.


eventType
additionalInfo
Type:string
nullable
Any additional text information related to the event.

changeUserId
Type:integer
nullable
ID of the user who registered the change.

changeUsername
Type:string
nullable
Example
Username who registered the change.

comChannelType
Type:string
nullable
Communication channel type (if applicable).

eventData
Type:object
nullable
Extra data payload for the event.

eventTimeUtc
Type:string
Format:date-time
Example
UTC time the event occurred (ISO 8601 format).

lat
Type:number
Format:double
nullable
Latitude of the event location.

locationContext
Type:string
nullable
Example
Contextual name of the location (e.g., shop name).

locationContextId
Type:integer
nullable
ID of the location context.

lon
Type:number
Format:double
nullable
Longitude of the event location.

message
Type:string
nullable
Specific message text associated with the event.

regSystem
Type:object
nullable
The system used to register the event.


regSystem

EventType​Copy link
Details about the specific type of event.

apiKey
Type:string
required
Example
The internal API key for the event type.

description
Type:string
required
Example
Human-readable description of the event type.

i18nKey
Type:string
required
Example
Internationalization key for the event type description.


EventGroup​Copy link
The grouping category for the event type.

id
Type:integer
required
Example
ID of the event group.

name
Type:string
required
Example
Name/key of the event group.


RegistrationSystem​Copy link
The system used to register the event.

id
Type:integer
required
Example
ID of the registration system.

name
Type:string
required
Example
Name of the registration system.

This documentation is created and maintained by Helthjem. For help, questions or feedback don't hesitate to email our support.


Become a customer

© 2025 Helthjem