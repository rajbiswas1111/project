<?php
 error_reporting(0);
include("display.php");
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Home Page</title>
    <link rel="stylesheet" href="index.css">
    

</head>

<body>
    <header class="nav">
        <a href="upload.php" id="up">Host</a>
    </header>

    <div class="search">
        <form action="">
        <input type="search" placeholder="Source"><br>
        
        <i class="icon"></i>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="icon" viewBox="0 0 16 16">
  <path fill-rule="evenodd" d="M11.5 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L11 2.707V14.5a.5.5 0 0 0 .5.5m-7-14a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L4 13.293V1.5a.5.5 0 0 1 .5-.5"/>
</svg><br>
            <input type="text" placeholder="Destination">
        </form>
    </div>
    <div class="ads"></div>

        <?php
        if ($total_row != 0) {
            while ($result = mysqli_fetch_assoc($data)) {
        ?>
    <div class="container">
                <div class="photo">
                    <img src="<?php echo "" . $result['Driver_img'] . "";?>" alt="">

                </div>

                <div class="details">

                    <div class="details_input1" id="name">
                        <label for="">Name</label>
                        <div class='details_input'><?php echo "" . $result['name'] . ""; ?></div>

                    </div>

                    <div class="details_input1" id="capacity">
                        <label for="">capacity</label>
                        <div class='details_input'><?php echo "" . $result['Capacity'] . ""; ?></div>

                    </div>

                    <div class="details_input1" id="vehical_number">
                        <label for="">Vehical Number</label>
                        <div class='details_input'><?php echo "" . $result['Vehicle_number'] . ""; ?></div>
                    </div>

                    <div class="details_input1" id="ph_number">
                        <label for="">Mobile Number</label>
                        <div class='details_input'><?php echo "" . $result['Mobile Number'] . ""; ?></div>
                    </div>

                    <div class="details_input1" id="source">
                        <label for="">From</label>
                        <div class='details_input'><?php echo "" . $result['Source'] . ""; ?></div>
                    </div>

                    <div class="details_input1" id="destination">
                        <label for="">TO</label>
                        <div class='details_input'><?php echo "" . $result['Destination'] . ""; ?></div>
                    </div>
                    
                    <div class="details_input1" style="border: none;">
                        <a href="tel:<?php echo "".$result['Mobile Number'];?>">Call Now</a>
                    </div>
                </div>

    </div>
             <?php
                }
            } else {
                echo "no record found";
            }
        ?>

</body>

</html>