<!--Daatabase Connection  -->
<?php
error_reporting(0);
    $servername = "localhost";
    $username = "root";
    $password = "";
    $dbname = "upload_data";

    $conn = mysqli_connect($servername,$username,$password,$dbname);

    if($conn)
    {
        //echo "successfull";
    }
    else{
        echo "failed";
    }

?>