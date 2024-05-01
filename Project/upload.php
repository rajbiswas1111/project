<?php
    error_reporting(0);
    include("connection.php");
    include("upload php.php");
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>upload page</title>
    <link rel="stylesheet" href="upload.css">
</head>
<body>
    <header class="nav">
    </header>

        <div class="inputs">
            <form method="post" action="#" enctype="multipart/form-data">

                <div class="title">
                    <p>DRIVER DETAIILS UPLOAD</p>
                    <hr>
                </div>
                
                <div class="part">
                    <label for="myfile" class="element">Upload Driver Photo*</label>
                    <input type="file" name="image" id="pic" accept="image/*" required><br>
                </div>

                <div class="part">
                    <label for="name" class="element">Enter your full Name*</label>
                    <input type="text" name="driver_name" class="myfile"  required><br>
                </div>

                <div class="part">
                    <label for="mobile" class="element">Enter your Mobile Number*</label>
                    <input type="number" name="mobile" class="myfile" required><br>
                </div>

                <div class="part">
                    <label for="source" class="element">Source Staton*</label>
                    <input type="text" name="source" class="myfile" placeholder="Enter your Source staton" required><br>
                </div>
                
                <div class="part">
                    <label for="destination"class="element">Destination Station*</label>
                    <input type="text" name="destination" class="myfile" placeholder="Enter your Destination"required><br>
                </div>

                <div class="part">
                    <label for="capacity" class="element">Car Capacity*</label>
                    <input type="number" name="capacity" class="myfile" required><br>
                 </div>

                 <div class="part">
                    <label for="vehicle" class="element">Enter your Vehicle number*</label>
                    <input type="text" name="vehicle_number" class="myfile" required><br>
                </div>

                <div class="part">
                    <label for="address" class="element">Enter your Address*</label>
                    <textarea name="address" id="" cols="22" rows="2" required></textarea>
                </div>

                <div class="part">
                    <label for="vimg" class="element">Enter Car Photo*</label>
                    <input type="file" name="vimg" id="pic" accept="image/*" required>
                </div>

                <div class="submit_btn">
                    <input type="submit" name="submit" value="SUBMIT" id="button">
                </div>
            </form>
        </div>
</body>
</html>